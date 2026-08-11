const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');
const { AlertEvent, AreaAlertRule } = require('../src/shared/models');
const { cache } = require('../src/modules/weather/weather.service');
const { runAlertTick } = require('../src/jobs/alert.worker');
const { decide, isDue, report } = require('../src/modules/areas/area.alert.rules');
const {
	setupTestDatabase,
	truncateAll,
	closeTestDatabase,
} = require('./helpers/db');
const { createUser, promoteToAdmin } = require('./helpers/auth');

const originalFetch = global.fetch;

const weatherPayload = (temp, precip) => ({
	latitude: 21.05,
	longitude: 105.85,
	timezone: 'Asia/Bangkok',
	utc_offset_seconds: 25200,
	current: {
		time: Math.floor(Date.now() / 1000),
		is_day: 1,
		temperature_2m: temp,
		apparent_temperature: temp,
		relative_humidity_2m: 70,
		precipitation: precip,
		weather_code: 0,
		wind_speed_10m: 5,
		wind_direction_10m: 180,
		pressure_msl: 1010,
	},
	hourly: { time: [], precipitation_probability: [] },
});

const stubWeather = (temp, precip = 0) => {
	global.fetch = async () =>
		new Response(JSON.stringify(weatherPayload(temp, precip)), {
			status: 200,
			headers: { 'content-type': 'application/json' },
		});
};

const AREA = {
	name: 'Hoàn Kiếm',
	area_type: 'district',
	address: 'Hà Nội',
	boundary: {
		type: 'Polygon',
		coordinates: [
			[
				[105.8, 21.0],
				[105.9, 21.0],
				[105.9, 21.1],
				[105.8, 21.1],
				[105.8, 21.0],
			],
		],
	},
};

const officer = async () => promoteToAdmin(await createUser());

const seedArea = async (user) => {
	const res = await request(app)
		.post('/api/gov/areas')
		.set(user.auth)
		.send(AREA)
		.expect(201);

	return res.body.area.id;
};

const rule = (overrides = {}) => ({
	metric: 'temp',
	threshold: 36,
	severity: 'warning',
	cooldown_minutes: 60,
	is_enabled: true,
	last_triggered_at: null,
	...overrides,
});

test.before(setupTestDatabase);
test.beforeEach(async () => {
	await truncateAll();
	cache.clear();
});
test.afterEach(() => {
	global.fetch = originalFetch;
});
test.after(closeTestDatabase);

test('a reading at the threshold fires, one below it does not', () => {
	assert.deepEqual(decide(rule(), { temp: 36 }), { fired: true, value: 36 });

	assert.deepEqual(decide(rule(), { temp: 35.9 }), {
		fired: false,
		reason: 'below_threshold',
		value: 35.9,
	});
});

test('a disabled rule is skipped before the weather is even read', () => {
	assert.deepEqual(decide(rule({ is_enabled: false }), { temp: 40 }), {
		fired: false,
		reason: 'disabled',
		value: null,
	});
});

test('a missing reading is reported as no data rather than a quiet pass', () => {
	assert.deepEqual(decide(rule({ metric: 'precipprob' }), { temp: 40 }), {
		fired: false,
		reason: 'no_data',
		value: null,
	});
});

test('the cooldown holds a rule back until force overrides it', () => {
	const justFired = rule({ last_triggered_at: new Date() });

	assert.deepEqual(decide(justFired, { temp: 40 }), {
		fired: false,
		reason: 'cooldown',
		value: 40,
	});

	assert.deepEqual(decide(justFired, { temp: 40 }, { force: true }), {
		fired: true,
		value: 40,
	});
});

test('a rule is due again once its quiet period has elapsed', () => {
	const now = new Date('2026-08-11T12:00:00Z');
	const fired = (minutesAgo) =>
		rule({ last_triggered_at: new Date(now.getTime() - minutesAgo * 60_000) });

	assert.equal(isDue(rule(), now), true);
	assert.equal(isDue(fired(59), now), false);
	assert.equal(isDue(fired(60), now), true);
	assert.equal(isDue(rule({ cooldown_minutes: 0, last_triggered_at: now }), now), true);
});

test('a report keeps the unit of each metric it fires on', () => {
	const outcome = report(
		[rule(), rule({ metric: 'precip', threshold: 20 })],
		{ temp: 38, precip: 5 }
	);

	assert.deepEqual(outcome.fired, [
		{ metric: 'temp', value: 38, threshold: 36, unit: 'C' },
	]);
	assert.deepEqual(outcome.skipped, [
		{ metric: 'precip', reason: 'below_threshold', value: 5 },
	]);
});

test('an officer saves a watch list and reads it back', async () => {
	const user = await officer();
	const areaId = await seedArea(user);

	const saved = await request(app)
		.put(`/api/gov/areas/${areaId}/alerts`)
		.set(user.auth)
		.send({
			rules: [
				{ metric: 'temp', threshold: 36 },
				{ metric: 'precip', threshold: 50, severity: 'critical' },
			],
		})
		.expect(200);

	assert.equal(saved.body.rules.length, 2);

	const listed = await request(app)
		.get(`/api/gov/areas/${areaId}/alerts`)
		.set(user.auth)
		.expect(200);

	const precip = listed.body.rules.find((row) => row.metric === 'precip');

	assert.equal(precip.threshold, 50);
	assert.equal(precip.severity, 'critical');
	assert.equal(precip.unit, 'mm');
	assert.equal(precip.cooldownMinutes, 60);
	assert.equal(precip.isEnabled, true);
});

test('a metric left out of the list is switched off', async () => {
	const user = await officer();
	const areaId = await seedArea(user);

	await request(app)
		.put(`/api/gov/areas/${areaId}/alerts`)
		.set(user.auth)
		.send({ rules: [{ metric: 'temp', threshold: 36 }, { metric: 'precip', threshold: 50 }] })
		.expect(200);

	const trimmed = await request(app)
		.put(`/api/gov/areas/${areaId}/alerts`)
		.set(user.auth)
		.send({ rules: [{ metric: 'temp', threshold: 30 }] })
		.expect(200);

	assert.deepEqual(
		trimmed.body.rules.map((row) => row.metric),
		['temp']
	);
	assert.equal(trimmed.body.rules[0].threshold, 30);
	assert.equal(await AreaAlertRule.count({ where: { area_id: areaId } }), 1);

	const cleared = await request(app)
		.put(`/api/gov/areas/${areaId}/alerts`)
		.set(user.auth)
		.send({ rules: [] })
		.expect(200);

	assert.deepEqual(cleared.body.rules, []);
});

test('a threshold outside the range of its metric is refused', async () => {
	const user = await officer();
	const areaId = await seedArea(user);

	await request(app)
		.put(`/api/gov/areas/${areaId}/alerts`)
		.set(user.auth)
		.send({ rules: [{ metric: 'precipprob', threshold: 180 }] })
		.expect(400);

	await request(app)
		.put(`/api/gov/areas/${areaId}/alerts`)
		.set(user.auth)
		.send({
			rules: [
				{ metric: 'temp', threshold: 30 },
				{ metric: 'temp', threshold: 31 },
			],
		})
		.expect(400);
});

test('one officer cannot touch the alerts of another officer area', async () => {
	const owner = await officer();
	const stranger = await officer();
	const areaId = await seedArea(owner);

	await request(app)
		.get(`/api/gov/areas/${areaId}/alerts`)
		.set(stranger.auth)
		.expect(404);

	await request(app)
		.put(`/api/gov/areas/${areaId}/alerts`)
		.set(stranger.auth)
		.send({ rules: [{ metric: 'temp', threshold: 10 }] })
		.expect(404);
});

test('an account without the admin role is refused outright', async () => {
	const user = await createUser();

	await request(app).get('/api/gov/areas/1/alerts').set(user.auth).expect(403);
});

test('running the watch list now delivers a real alert', async () => {
	const user = await officer();
	const areaId = await seedArea(user);
	stubWeather(39);

	await request(app)
		.put(`/api/gov/areas/${areaId}/alerts`)
		.set(user.auth)
		.send({ rules: [{ metric: 'temp', threshold: 36 }] })
		.expect(200);

	const first = await request(app)
		.post(`/api/gov/areas/${areaId}/alerts/evaluate`)
		.set(user.auth)
		.send({})
		.expect(200);

	assert.deepEqual(first.body.fired, [
		{ metric: 'temp', value: 39, threshold: 36, unit: 'C' },
	]);

	const events = await AlertEvent.findAll({ where: { user_id: user.id } });

	assert.equal(events.length, 1);
	assert.equal(events[0].area_id, areaId);
	assert.equal(events[0].rule_id, null);
	assert.match(events[0].title, /Hoàn Kiếm/);

	const second = await request(app)
		.post(`/api/gov/areas/${areaId}/alerts/evaluate`)
		.set(user.auth)
		.send({})
		.expect(200);

	assert.deepEqual(second.body.fired, []);
	assert.equal(second.body.skipped[0].reason, 'cooldown');

	const forced = await request(app)
		.post(`/api/gov/areas/${areaId}/alerts/evaluate`)
		.set(user.auth)
		.send({ force: true })
		.expect(200);

	assert.equal(forced.body.fired.length, 1);
	assert.equal(await AlertEvent.count({ where: { user_id: user.id } }), 2);
});

test('the alert tick evaluates area rules alongside personal ones', async () => {
	const user = await officer();
	const areaId = await seedArea(user);
	stubWeather(20, 80);

	await request(app)
		.put(`/api/gov/areas/${areaId}/alerts`)
		.set(user.auth)
		.send({ rules: [{ metric: 'precip', threshold: 50 }] })
		.expect(200);

	await runAlertTick();

	const events = await AlertEvent.findAll({ where: { area_id: areaId } });

	assert.equal(events.length, 1);
	assert.equal(events[0].metric, 'precip');
	assert.equal(events[0].value, 80);

	const stored = await AreaAlertRule.findOne({ where: { area_id: areaId } });

	assert.equal(stored.last_value, 80);
	assert.notEqual(stored.last_triggered_at, null);

	await runAlertTick();

	assert.equal(await AlertEvent.count({ where: { area_id: areaId } }), 1);
});

test('the notification feed carries the area an alert came from', async () => {
	const user = await officer();
	const areaId = await seedArea(user);
	stubWeather(41);

	await request(app)
		.put(`/api/gov/areas/${areaId}/alerts`)
		.set(user.auth)
		.send({ rules: [{ metric: 'temp', threshold: 36 }] })
		.expect(200);

	await request(app)
		.post(`/api/gov/areas/${areaId}/alerts/evaluate`)
		.set(user.auth)
		.send({})
		.expect(200);

	const feed = await request(app)
		.get('/api/alerts/events')
		.set(user.auth)
		.expect(200);

	assert.equal(feed.body.events[0].areaId, areaId);
	assert.equal(feed.body.events[0].ruleId, null);
});
