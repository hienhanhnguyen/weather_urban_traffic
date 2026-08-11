const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');
const { AlertEvent } = require('../src/shared/models');
const {
	setupTestDatabase,
	truncateAll,
	closeTestDatabase,
} = require('./helpers/db');
const { createUser } = require('./helpers/auth');

const LOCATION = {
	custom_name: 'Office',
	latitude: 21.0,
	longitude: 105.8,
};

const RULE = {
	metric: 'temp',
	operator: '>',
	threshold: 35,
};

const createLocation = async (user) => {
	const res = await request(app)
		.post('/api/locations')
		.set(user.auth)
		.send(LOCATION)
		.expect(201);
	return res.body.location.id;
};

test.before(setupTestDatabase);
test.beforeEach(truncateAll);
test.after(closeTestDatabase);

test('creating a rule fills in the default unit for the metric', async () => {
	const user = await createUser();
	const locationId = await createLocation(user);

	const res = await request(app)
		.post('/api/alerts/rules')
		.set(user.auth)
		.send({ ...RULE, location_id: locationId })
		.expect(201);

	assert.equal(res.body.rule.unit, 'C');
	assert.equal(res.body.rule.severity, 'warning');
	assert.equal(res.body.rule.cooldownMinutes, 60);
});

test('a rule cannot be attached to someone else\'s location', async () => {
	const owner = await createUser();
	const stranger = await createUser();
	const locationId = await createLocation(owner);

	const res = await request(app)
		.post('/api/alerts/rules')
		.set(stranger.auth)
		.send({ ...RULE, location_id: locationId })
		.expect(404);

	assert.equal(res.body.error.code, 'NOT_FOUND');
});

test('another user cannot read or delete your rule (BOLA)', async () => {
	const owner = await createUser();
	const stranger = await createUser();
	const locationId = await createLocation(owner);

	const created = await request(app)
		.post('/api/alerts/rules')
		.set(owner.auth)
		.send({ ...RULE, location_id: locationId })
		.expect(201);

	const id = created.body.rule.id;

	await request(app).get(`/api/alerts/rules/${id}`).set(stranger.auth).expect(404);
	await request(app)
		.delete(`/api/alerts/rules/${id}`)
		.set(stranger.auth)
		.expect(404);

	await request(app).get(`/api/alerts/rules/${id}`).set(owner.auth).expect(200);
});

test('an invalid metric is rejected with a field-level detail', async () => {
	const user = await createUser();
	const locationId = await createLocation(user);

	const res = await request(app)
		.post('/api/alerts/rules')
		.set(user.auth)
		.send({ ...RULE, metric: 'humidity', location_id: locationId })
		.expect(400);

	assert.ok(res.body.error.details.some((d) => d.field === 'metric'));
});

test('rules can be listed for one location only', async () => {
	const user = await createUser();
	const office = await createLocation(user);

	const home = await request(app)
		.post('/api/locations')
		.set(user.auth)
		.send({ ...LOCATION, custom_name: 'Home' })
		.expect(201);

	for (const location_id of [office, home.body.location.id]) {
		await request(app)
			.post('/api/alerts/rules')
			.set(user.auth)
			.send({ ...RULE, location_id })
			.expect(201);
	}

	const all = await request(app)
		.get('/api/alerts/rules')
		.set(user.auth)
		.expect(200);
	assert.equal(all.body.rules.length, 2);

	const filtered = await request(app)
		.get('/api/alerts/rules')
		.query({ location_id: office })
		.set(user.auth)
		.expect(200);

	assert.equal(filtered.body.rules.length, 1);
	assert.equal(filtered.body.rules[0].locationId, office);
	assert.equal(filtered.body.pagination.total, 1);
});

test('changing the metric re-derives the unit', async () => {
	const user = await createUser();
	const locationId = await createLocation(user);

	const created = await request(app)
		.post('/api/alerts/rules')
		.set(user.auth)
		.send({ ...RULE, location_id: locationId })
		.expect(201);

	assert.equal(created.body.rule.unit, 'C');

	const patched = await request(app)
		.patch(`/api/alerts/rules/${created.body.rule.id}`)
		.set(user.auth)
		.send({ metric: 'precip' })
		.expect(200);

	assert.equal(patched.body.rule.unit, 'mm');

	// An explicit unit still wins over the default.
	const explicit = await request(app)
		.patch(`/api/alerts/rules/${created.body.rule.id}`)
		.set(user.auth)
		.send({ metric: 'precipprob', unit: 'pct' })
		.expect(200);

	assert.equal(explicit.body.rule.unit, 'pct');
});

test('deleting a location deletes the alert rules attached to it', async () => {
	const user = await createUser();
	const locationId = await createLocation(user);

	await request(app)
		.post('/api/alerts/rules')
		.set(user.auth)
		.send({ ...RULE, location_id: locationId })
		.expect(201);

	await request(app)
		.delete(`/api/locations/${locationId}`)
		.set(user.auth)
		.expect(204);

	const remaining = await request(app)
		.get('/api/alerts/rules')
		.set(user.auth)
		.expect(200);

	assert.equal(remaining.body.rules.length, 0);
});

test('events are listed and marked read only for their owner', async () => {
	const owner = await createUser();
	const stranger = await createUser();

	const event = await AlertEvent.create({
		user_id: owner.id,
		title: 'Temperature above 35C',
		severity: 'warning',
		metric: 'temp',
		value: 36.4,
	});

	const strangerList = await request(app)
		.get('/api/alerts/events')
		.set(stranger.auth)
		.expect(200);
	assert.equal(strangerList.body.events.length, 0);

	await request(app)
		.patch(`/api/alerts/events/${event.event_id}/read`)
		.set(stranger.auth)
		.expect(404);

	await request(app)
		.patch(`/api/alerts/events/${event.event_id}/read`)
		.set(owner.auth)
		.expect(204);

	await event.reload();
	assert.equal(event.is_read, true);
});

test('events can be narrowed by severity and by date range', async () => {
	const user = await createUser();

	const seed = async (severity, createdAt) => {
		const event = await AlertEvent.create({
			user_id: user.id,
			title: `${severity} at ${createdAt}`,
			severity,
			metric: 'temp',
			value: 36.4,
		});

		await AlertEvent.update(
			{ createdAt: new Date(createdAt) },
			{
				where: { event_id: event.event_id },
				fields: ['createdAt'],
				silent: true,
			}
		);

		return event;
	};

	await seed('info', '2026-03-01T08:00:00Z');
	await seed('critical', '2026-03-05T08:00:00Z');
	await seed('critical', '2026-03-09T08:00:00Z');

	const bySeverity = await request(app)
		.get('/api/alerts/events')
		.query({ severity: 'critical' })
		.set(user.auth)
		.expect(200);

	assert.equal(bySeverity.body.pagination.total, 2);
	assert.ok(
		bySeverity.body.events.every((event) => event.severity === 'critical')
	);

	const byDate = await request(app)
		.get('/api/alerts/events')
		.query({ from: '2026-03-04T00:00:00Z', to: '2026-03-06T23:59:59Z' })
		.set(user.auth)
		.expect(200);

	assert.equal(byDate.body.pagination.total, 1);
	assert.equal(byDate.body.events[0].severity, 'critical');
	assert.equal(
		byDate.body.events[0].createdAt,
		new Date('2026-03-05T08:00:00Z').toISOString()
	);
});

test('a date range that ends before it starts is rejected', async () => {
	const user = await createUser();

	const res = await request(app)
		.get('/api/alerts/events')
		.query({ from: '2026-03-09T00:00:00Z', to: '2026-03-01T00:00:00Z' })
		.set(user.auth)
		.expect(400);

	assert.equal(res.body.error.details[0].field, 'to');
});

test('marking every event read leaves other accounts alone', async () => {
	const owner = await createUser();
	const stranger = await createUser();

	const seed = (userId) =>
		AlertEvent.create({
			user_id: userId,
			title: 'Temperature above 35C',
			severity: 'warning',
			metric: 'temp',
			value: 36.4,
		});

	await seed(owner.id);
	await seed(owner.id);
	const other = await seed(stranger.id);

	const res = await request(app)
		.patch('/api/alerts/events/read-all')
		.set(owner.auth)
		.expect(200);

	assert.equal(res.body.updated, 2);

	await other.reload();
	assert.equal(other.is_read, false);
});
