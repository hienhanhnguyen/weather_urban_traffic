const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');
const { cache } = require('../src/modules/weather/weather.service');
const {
	setupTestDatabase,
	truncateAll,
	closeTestDatabase,
} = require('./helpers/db');
const { createUser } = require('./helpers/auth');

const originalFetch = global.fetch;

const stubFetch = (impl) => {
	global.fetch = impl;
};

const nowSeconds = () => Math.floor(Date.now() / 1000);

/** What Open-Meteo returns for `current=` with `timeformat=unixtime`. */
const currentPayload = (overrides = {}) => ({
	latitude: 21,
	longitude: 105.8,
	timezone: 'Asia/Bangkok',
	utc_offset_seconds: 25200,
	current: {
		time: nowSeconds(),
		is_day: 1,
		temperature_2m: 30,
		apparent_temperature: 34,
		relative_humidity_2m: 78,
		precipitation: 0.4,
		weather_code: 61,
		wind_speed_10m: 12,
		wind_direction_10m: 190,
		pressure_msl: 1008,
	},
	hourly: {
		time: [nowSeconds() - 1800, nowSeconds() + 1800],
		precipitation_probability: [55, 90],
	},
	...overrides,
});

const okJson = (body) =>
	new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'content-type': 'application/json' },
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

test('weather endpoints require authentication', async () => {
	await request(app).get('/api/weather/current?lat=21&lon=105.8').expect(401);
});

test('the response carries no upstream vocabulary', async () => {
	const user = await createUser();
	stubFetch(async () => okJson(currentPayload()));

	const res = await request(app)
		.get('/api/weather/current?lat=21.0285&lon=105.8048')
		.set(user.auth)
		.expect(200);

	const { current } = res.body;

	assert.equal(current.temp, 30);
	assert.equal(current.feelsLike, 34);
	assert.equal(current.humidity, 78);
	assert.equal(current.weatherCode, 61);
	assert.equal(current.isDay, true);
	assert.equal(current.units.temp, '°C');
	assert.equal(current.timezone, 'Asia/Bangkok');

	// The raw field names must not survive the mapper.
	const serialised = JSON.stringify(res.body);
	assert.equal(serialised.includes('temperature_2m'), false);
	assert.equal(serialised.includes('weather_code'), false);
});

test('chance of rain comes from the hourly slot covering now', async () => {
	const user = await createUser();
	stubFetch(async () => okJson(currentPayload()));

	const res = await request(app)
		.get('/api/weather/current?lat=21&lon=105.8')
		.set(user.auth)
		.expect(200);

	// The slot that started half an hour ago, not the one starting later.
	assert.equal(res.body.current.precipProb, 55);
});

test('imperial units change both the values requested and the labels', async () => {
	const user = await createUser();
	let requested = '';

	stubFetch(async (url) => {
		requested = String(url);
		return okJson(currentPayload());
	});

	const res = await request(app)
		.get('/api/weather/current?lat=21&lon=105.8&units=imperial')
		.set(user.auth)
		.expect(200);

	assert.equal(requested.includes('temperature_unit=fahrenheit'), true);
	assert.equal(res.body.current.units.temp, '°F');
});

test('a second identical request is served from cache', async () => {
	const user = await createUser();
	let calls = 0;

	stubFetch(async () => {
		calls += 1;
		return okJson(currentPayload());
	});

	await request(app)
		.get('/api/weather/current?lat=21.0285&lon=105.8048')
		.set(user.auth)
		.expect(200);

	// Close enough to round to the same grid square.
	await request(app)
		.get('/api/weather/current?lat=21.0288&lon=105.8041')
		.set(user.auth)
		.expect(200);

	assert.equal(calls, 1);
});

test('the forecast drops hours that have already passed', async () => {
	const user = await createUser();
	const hour = 3600;
	const base = Math.floor(nowSeconds() / hour) * hour;

	stubFetch(async () =>
		okJson({
			latitude: 21,
			longitude: 105.8,
			timezone: 'Asia/Bangkok',
			utc_offset_seconds: 25200,
			hourly: {
				time: [base - 5 * hour, base - 3 * hour, base, base + hour],
				temperature_2m: [20, 21, 22, 23],
				apparent_temperature: [20, 21, 22, 23],
				precipitation: [0, 0, 1, 2],
				precipitation_probability: [0, 10, 60, 80],
				weather_code: [0, 1, 61, 63],
			},
			daily: {
				time: [base],
				weather_code: [61],
				temperature_2m_max: [33],
				temperature_2m_min: [24],
				precipitation_sum: [12],
				precipitation_probability_max: [80],
				sunrise: [base],
				sunset: [base + 12 * hour],
			},
		})
	);

	const res = await request(app)
		.get('/api/weather/forecast?lat=21&lon=105.8')
		.set(user.auth)
		.expect(200);

	// Only the hour in progress and later survive.
	assert.equal(res.body.hourly.length, 2);
	assert.equal(res.body.hourly[0].temp, 22);
	assert.equal(res.body.hourly[0].precipProb, 60);
	assert.equal(res.body.daily[0].tempMax, 33);
});

test('an upstream rate limit becomes a 503, not a 429', async () => {
	const user = await createUser();

	stubFetch(
		async () =>
			new Response(JSON.stringify({ reason: 'Minutely API request limit' }), {
				status: 429,
				headers: { 'content-type': 'application/json' },
			})
	);

	const res = await request(app)
		.get('/api/weather/current?lat=10&lon=100')
		.set(user.auth)
		.expect(503);

	assert.equal(res.body.error.code, 'SERVICE_UNAVAILABLE');
	assert.equal(res.body.error.message.includes('Minutely'), false);
});

test('out-of-range coordinates are rejected before any upstream call', async () => {
	const user = await createUser();
	let calls = 0;
	stubFetch(async () => {
		calls += 1;
		return okJson(currentPayload());
	});

	await request(app)
		.get('/api/weather/current?lat=999&lon=105')
		.set(user.auth)
		.expect(400);

	assert.equal(calls, 0);
});

test('the removed geocode endpoint is gone', async () => {
	const user = await createUser();

	// Superseded by /api/geo/search, which is not tied to the weather provider.
	await request(app)
		.get('/api/weather/geocode?q=Hanoi')
		.set(user.auth)
		.expect(404);
});
