const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');
const { AlertEvent, sequelize } = require('../src/shared/models');
const { rangeFor, summarise } = require('../src/modules/incidents/incidents.report');
const {
	setupTestDatabase,
	truncateAll,
	closeTestDatabase,
} = require('./helpers/db');
const { createUser, promoteToAdmin } = require('./helpers/auth');

const HOUR_MS = 60 * 60 * 1000;

const polygon = (west, south) => ({
	type: 'Polygon',
	coordinates: [
		[
			[west, south],
			[west + 0.1, south],
			[west + 0.1, south + 0.1],
			[west, south + 0.1],
			[west, south],
		],
	],
});

const officer = async () => promoteToAdmin(await createUser());

const seedArea = async (user, name, west = 105.8, south = 21.0) => {
	const res = await request(app)
		.post('/api/gov/areas')
		.set(user.auth)
		.send({
			name,
			area_type: 'district',
			address: 'Hà Nội',
			boundary: polygon(west, south),
		})
		.expect(201);

	return res.body.area.id;
};

const seedEvent = async (user, { at, ...overrides } = {}) => {
	const event = await AlertEvent.create({
		user_id: user.id,
		title: 'Temperature alert',
		body: 'It is hot.',
		severity: 'warning',
		metric: 'temp',
		value: 39,
		...overrides,
	});

	if (at !== undefined) {
		await sequelize.query(
			'UPDATE alert_event SET created_at = ? WHERE event_id = ?',
			{ replacements: [at, event.event_id] }
		);
	}

	return event;
};

test.before(setupTestDatabase);
test.beforeEach(truncateAll);
test.after(closeTestDatabase);

test('rangeFor turns a timeframe into a lower bound', () => {
	const now = new Date('2026-03-10T12:00:00Z');

	assert.deepEqual(rangeFor({ timeframe: '24h' }, now), {
		from: new Date('2026-03-09T12:00:00Z'),
	});

	assert.deepEqual(rangeFor({ timeframe: '7d' }, now), {
		from: new Date('2026-03-03T12:00:00Z'),
	});
});

test('rangeFor leaves the window open for "all" and for nothing at all', () => {
	assert.deepEqual(rangeFor({ timeframe: 'all' }), {});
	assert.deepEqual(rangeFor({}), {});
	assert.deepEqual(rangeFor(), {});
});

test('rangeFor lets explicit dates win over a timeframe', () => {
	const from = new Date('2026-01-01T00:00:00Z');
	const to = new Date('2026-01-31T23:59:59Z');

	assert.deepEqual(rangeFor({ timeframe: '24h', from, to }), { from, to });
	assert.deepEqual(rangeFor({ timeframe: '24h', to }), { to });
});

test('summarise folds the grouped counts into dashboard numbers', () => {
	const older = new Date('2026-03-01T08:00:00Z');
	const newer = new Date('2026-03-02T08:00:00Z');

	const result = summarise(
		[
			{ areaId: 1, severity: 'warning', status: 'pending', count: 3, lastAt: older },
			{ areaId: 1, severity: 'critical', status: 'resolved', count: 1, lastAt: newer },
			{ areaId: 2, severity: 'info', status: 'pending', count: 2, lastAt: older },
		],
		[
			{ id: 1, name: 'Ba Đình' },
			{ id: 2, name: 'Hoàn Kiếm' },
			{ id: 3, name: 'Tây Hồ' },
		]
	);

	assert.equal(result.total, 6);
	assert.deepEqual(result.bySeverity, { info: 2, warning: 3, critical: 1 });
	assert.deepEqual(result.byStatus, {
		pending: 5,
		acknowledged: 0,
		resolved: 1,
	});
	assert.equal(result.areasAffected, 2);

	assert.deepEqual(result.areas[0], {
		areaId: 1,
		name: 'Ba Đình',
		total: 4,
		pending: 3,
		worstSeverity: 'critical',
		lastAt: newer,
	});
});

test('summarise still reports an area with nothing against it', () => {
	const result = summarise([], [{ id: 9, name: 'Tây Hồ' }]);

	assert.equal(result.total, 0);
	assert.equal(result.areasAffected, 0);
	assert.deepEqual(result.areas, [
		{
			areaId: 9,
			name: 'Tây Hồ',
			total: 0,
			pending: 0,
			worstSeverity: null,
			lastAt: null,
		},
	]);
});

test('summarise drops a bucket whose area is gone', () => {
	const result = summarise(
		[{ areaId: 404, severity: 'info', status: 'pending', count: 5, lastAt: null }],
		[{ id: 1, name: 'Ba Đình' }]
	);

	assert.equal(result.total, 0);
	assert.equal(result.areas[0].total, 0);
});

test('the list shows area events newest first and names the area', async () => {
	const user = await officer();
	const areaId = await seedArea(user, 'Ba Đình');

	await seedEvent(user, { area_id: areaId, title: 'First' });
	await seedEvent(user, { area_id: areaId, title: 'Second' });

	const res = await request(app)
		.get('/api/gov/incidents')
		.set(user.auth)
		.expect(200);

	assert.equal(res.body.pagination.total, 2);
	assert.deepEqual(
		res.body.incidents.map((incident) => incident.title),
		['Second', 'First']
	);
	assert.equal(res.body.incidents[0].areaName, 'Ba Đình');
	assert.equal(res.body.incidents[0].status, 'pending');
});

test('a personal alert with no area is not an incident', async () => {
	const user = await officer();
	const areaId = await seedArea(user, 'Ba Đình');

	await seedEvent(user, { area_id: areaId, title: 'Area alert' });
	const personal = await seedEvent(user, { title: 'Home alert' });

	const res = await request(app)
		.get('/api/gov/incidents')
		.set(user.auth)
		.expect(200);

	assert.deepEqual(
		res.body.incidents.map((incident) => incident.title),
		['Area alert']
	);

	await request(app)
		.get(`/api/gov/incidents/${personal.event_id}`)
		.set(user.auth)
		.expect(404);
});

test('the list filters by area, severity and timeframe', async () => {
	const user = await officer();
	const first = await seedArea(user, 'Ba Đình');
	const second = await seedArea(user, 'Hoàn Kiếm', 106.0, 20.8);

	await seedEvent(user, { area_id: first, severity: 'critical' });
	await seedEvent(user, { area_id: second, severity: 'info' });
	await seedEvent(user, {
		area_id: second,
		severity: 'warning',
		at: new Date(Date.now() - 48 * HOUR_MS),
	});

	const byArea = await request(app)
		.get('/api/gov/incidents')
		.query({ area_id: second })
		.set(user.auth)
		.expect(200);
	assert.equal(byArea.body.pagination.total, 2);

	const bySeverity = await request(app)
		.get('/api/gov/incidents')
		.query({ severity: 'critical' })
		.set(user.auth)
		.expect(200);
	assert.equal(bySeverity.body.pagination.total, 1);
	assert.equal(bySeverity.body.incidents[0].areaId, first);

	const recent = await request(app)
		.get('/api/gov/incidents')
		.query({ timeframe: '24h' })
		.set(user.auth)
		.expect(200);
	assert.equal(recent.body.pagination.total, 2);
});

test('the summary counts every managed area, busy ones first', async () => {
	const user = await officer();
	const busy = await seedArea(user, 'Ba Đình');
	await seedArea(user, 'Hoàn Kiếm', 106.0, 20.8);

	await seedEvent(user, { area_id: busy, severity: 'critical' });
	await seedEvent(user, { area_id: busy, severity: 'info' });

	const res = await request(app)
		.get('/api/gov/incidents/summary')
		.set(user.auth)
		.expect(200);

	assert.equal(res.body.total, 2);
	assert.equal(res.body.areasAffected, 1);
	assert.deepEqual(res.body.bySeverity, { info: 1, warning: 0, critical: 1 });
	assert.equal(res.body.byStatus.pending, 2);

	assert.equal(res.body.areas.length, 2);
	assert.equal(res.body.areas[0].areaId, busy);
	assert.equal(res.body.areas[0].worstSeverity, 'critical');
	assert.equal(res.body.areas[1].total, 0);
});

test('acknowledging an incident stamps it, keeps the note and marks it read', async () => {
	const user = await officer();
	const areaId = await seedArea(user, 'Ba Đình');
	const event = await seedEvent(user, { area_id: areaId });

	const res = await request(app)
		.patch(`/api/gov/incidents/${event.event_id}/status`)
		.set(user.auth)
		.send({ status: 'acknowledged', note: 'Pumps running' })
		.expect(200);

	assert.equal(res.body.incident.status, 'acknowledged');
	assert.equal(res.body.incident.handledNote, 'Pumps running');
	assert.ok(res.body.incident.handledAt);
	assert.equal(res.body.incident.isRead, true);
});

test('reopening an incident clears the handling record', async () => {
	const user = await officer();
	const areaId = await seedArea(user, 'Ba Đình');
	const event = await seedEvent(user, { area_id: areaId });

	await request(app)
		.patch(`/api/gov/incidents/${event.event_id}/status`)
		.set(user.auth)
		.send({ status: 'resolved', note: 'Water gone' })
		.expect(200);

	const res = await request(app)
		.patch(`/api/gov/incidents/${event.event_id}/status`)
		.set(user.auth)
		.send({ status: 'pending' })
		.expect(200);

	assert.equal(res.body.incident.status, 'pending');
	assert.equal(res.body.incident.handledAt, null);
	assert.equal(res.body.incident.handledNote, null);
});

test('an unknown status is rejected', async () => {
	const user = await officer();
	const areaId = await seedArea(user, 'Ba Đình');
	const event = await seedEvent(user, { area_id: areaId });

	await request(app)
		.patch(`/api/gov/incidents/${event.event_id}/status`)
		.set(user.auth)
		.send({ status: 'handled' })
		.expect(400);
});

test('one officer cannot see or touch another officer incident', async () => {
	const owner = await officer();
	const stranger = await officer();
	const areaId = await seedArea(owner, 'Ba Đình');
	const event = await seedEvent(owner, { area_id: areaId });

	const res = await request(app)
		.get('/api/gov/incidents')
		.set(stranger.auth)
		.expect(200);
	assert.equal(res.body.pagination.total, 0);

	await request(app)
		.get(`/api/gov/incidents/${event.event_id}`)
		.set(stranger.auth)
		.expect(404);

	await request(app)
		.patch(`/api/gov/incidents/${event.event_id}/status`)
		.set(stranger.auth)
		.send({ status: 'resolved' })
		.expect(404);
});

test('an account without the admin role is refused', async () => {
	const user = await createUser();

	await request(app).get('/api/gov/incidents').set(user.auth).expect(403);
	await request(app)
		.get('/api/gov/incidents/summary')
		.set(user.auth)
		.expect(403);
});
