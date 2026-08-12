const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');
const { cache } = require('../src/modules/weather/weather.service');
const {
	gridKey,
	metricStatus,
	riskOf,
} = require('../src/modules/areas/area.heatmap');
const {
	setupTestDatabase,
	truncateAll,
	closeTestDatabase,
} = require('./helpers/db');
const { createUser, promoteToAdmin } = require('./helpers/auth');

const originalFetch = global.fetch;

let fetchCalls = 0;

const weatherPayload = ({ temp, precip }) => {
	const now = Math.floor(Date.now() / 1000);

	return {
		latitude: 21.05,
		longitude: 105.85,
		timezone: 'Asia/Bangkok',
		utc_offset_seconds: 25200,
		current: {
			time: now,
			is_day: 1,
			temperature_2m: temp,
			apparent_temperature: temp + 1,
			relative_humidity_2m: 70,
			precipitation: precip,
			weather_code: 61,
			wind_speed_10m: 24,
			wind_direction_10m: 180,
			pressure_msl: 1010,
		},
		hourly: { time: [now], precipitation_probability: [80] },
	};
};

const stubWeather = ({ temp = 30, precip = 0 } = {}) => {
	fetchCalls = 0;
	global.fetch = async () => {
		fetchCalls += 1;
		return new Response(JSON.stringify(weatherPayload({ temp, precip })), {
			status: 200,
			headers: { 'content-type': 'application/json' },
		});
	};
};

const failWeather = () => {
	fetchCalls = 0;
	global.fetch = async () => {
		fetchCalls += 1;
		throw new Error('upstream down');
	};
};

const squareAt = (lng, lat, size = 0.02) => ({
	type: 'Polygon',
	coordinates: [
		[
			[lng, lat],
			[lng + size, lat],
			[lng + size, lat + size],
			[lng, lat + size],
			[lng, lat],
		],
	],
});

const officer = async () => promoteToAdmin(await createUser());

const seedArea = async (user, name, boundary) => {
	const res = await request(app)
		.post('/api/gov/areas')
		.set(user.auth)
		.send({ name, area_type: 'ward', boundary });

	assert.equal(res.status, 201);

	return res.body.area;
};

const setRules = (user, areaId, rules) =>
	request(app).put(`/api/gov/areas/${areaId}/alerts`).set(user.auth).send({ rules });

const getHeatmap = (user) =>
	request(app).get('/api/gov/areas/heatmap').set(user.auth);

const rule = (overrides = {}) => ({
	metric: 'temp',
	threshold: 35,
	severity: 'warning',
	cooldown_minutes: 60,
	is_enabled: true,
	...overrides,
});

test.before(setupTestDatabase);

test.beforeEach(async () => {
	await truncateAll();
	cache.clear();
	stubWeather();
});

test.after(async () => {
	global.fetch = originalFetch;
	await closeTestDatabase();
});

test('the grid key rounds a centre to the square the weather is read for', () => {
	assert.equal(
		gridKey({ center_latitude: 21.0512, center_longitude: 105.8471 }),
		'21.05,105.85'
	);

	// Two centres 300 m apart share a square, so they share a reading.
	assert.equal(
		gridKey({ center_latitude: 21.0512, center_longitude: 105.8471 }),
		gridKey({ center_latitude: 21.0489, center_longitude: 105.8523 })
	);
});

test('a metric is exceeded at its threshold, not only past it', () => {
	const current = { temp: 35, precip: 2 };

	assert.equal(metricStatus(rule({ threshold: 35 }), current).exceeded, true);
	assert.equal(metricStatus(rule({ threshold: 36 }), current).exceeded, false);
});

test('a metric with no reading has a null value and is not exceeded', () => {
	const status = metricStatus(rule({ threshold: 10 }), null);

	assert.equal(status.value, null);
	assert.equal(status.exceeded, false);
	assert.equal(status.unit, 'C');
});

test('an area nobody is watching is none, not clear', () => {
	assert.equal(riskOf([], { hasReading: true }), 'none');
});

test('a watched area whose reading never arrived is unknown, not clear', () => {
	const metrics = [metricStatus(rule(), null)];

	assert.equal(riskOf(metrics, { hasReading: false }), 'unknown');
});

test('a watched area meeting every rule is clear', () => {
	const metrics = [metricStatus(rule({ threshold: 40 }), { temp: 30 })];

	assert.equal(riskOf(metrics, { hasReading: true }), 'clear');
});

test('the risk is the worst severity among the rules being broken', () => {
	const metrics = [
		metricStatus(rule({ metric: 'temp', threshold: 20, severity: 'info' }), {
			temp: 30,
			precip: 1,
		}),
		metricStatus(
			rule({ metric: 'precip', threshold: 0.5, severity: 'critical' }),
			{ temp: 30, precip: 1 }
		),
	];

	assert.equal(riskOf(metrics, { hasReading: true }), 'critical');
});

test('a disabled rule is neither watched nor able to raise the risk', () => {
	const metrics = [
		metricStatus(rule({ threshold: 10, is_enabled: false }), { temp: 30 }),
	];

	assert.equal(riskOf(metrics, { hasReading: true }), 'none');
});

test('the heatmap returns every managed area with its boundary and reading', async () => {
	const user = await officer();
	await seedArea(user, 'Ward A', squareAt(105.84, 21.04));

	const res = await getHeatmap(user);

	assert.equal(res.status, 200);
	assert.equal(res.body.areas.length, 1);

	const [area] = res.body.areas;

	assert.equal(area.name, 'Ward A');
	assert.equal(area.boundary.type, 'Polygon');
	assert.equal(area.reading.temp, 30);
	assert.equal(area.reading.windSpeed, 24);
	assert.equal(area.reading.precipProb, 80);
	assert.equal(area.metrics.length, 0);
	assert.equal(area.risk, 'none');
});

test('an area is coloured by the worst rule its live reading breaks', async () => {
	const user = await officer();
	stubWeather({ temp: 39, precip: 12 });

	const area = await seedArea(user, 'Ward A', squareAt(105.84, 21.04));

	await setRules(user, area.id, [
		rule({ metric: 'temp', threshold: 35, severity: 'warning' }),
		rule({ metric: 'precip', threshold: 10, severity: 'critical' }),
	]);

	const res = await getHeatmap(user);
	const [row] = res.body.areas;

	assert.equal(row.risk, 'critical');
	assert.deepEqual(
		row.metrics.map((metric) => [metric.metric, metric.exceeded]),
		[
			['temp', true],
			['precip', true],
		]
	);
});

test('a watched area inside its thresholds comes back clear', async () => {
	const user = await officer();
	stubWeather({ temp: 26, precip: 0 });

	const area = await seedArea(user, 'Ward A', squareAt(105.84, 21.04));
	await setRules(user, area.id, [rule({ threshold: 35 })]);

	const res = await getHeatmap(user);

	assert.equal(res.body.areas[0].risk, 'clear');
	assert.equal(res.body.areas[0].metrics[0].exceeded, false);
});

test('areas sharing a grid square cost one weather call', async () => {
	const user = await officer();

	await seedArea(user, 'Ward A', squareAt(105.84, 21.04));
	await seedArea(user, 'Ward B', squareAt(105.842, 21.042));
	await seedArea(user, 'Ward C', squareAt(106.7, 10.78));

	cache.clear();
	stubWeather();

	const res = await getHeatmap(user);

	assert.equal(res.status, 200);
	assert.equal(res.body.areas.length, 3);
	assert.equal(fetchCalls, 2);
});

test('a weather failure leaves the area unknown instead of losing the map', async () => {
	const user = await officer();

	const area = await seedArea(user, 'Ward A', squareAt(105.84, 21.04));
	await setRules(user, area.id, [rule({ threshold: 35 })]);

	cache.clear();
	failWeather();

	const res = await getHeatmap(user);

	assert.equal(res.status, 200);
	assert.equal(res.body.areas[0].risk, 'unknown');
	assert.equal(res.body.areas[0].reading, null);
	assert.equal(res.body.areas[0].metrics[0].value, null);
});

test('the heatmap only ever shows the areas the officer manages', async () => {
	const mine = await officer();
	const theirs = await officer();

	await seedArea(theirs, 'Their ward', squareAt(105.84, 21.04));

	const res = await getHeatmap(mine);

	assert.equal(res.status, 200);
	assert.deepEqual(res.body.areas, []);
});

test('a non-admin account cannot read the heatmap', async () => {
	const user = await createUser();

	const res = await getHeatmap(user);

	assert.equal(res.status, 403);
});
