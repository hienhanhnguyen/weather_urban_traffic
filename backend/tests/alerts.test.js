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
