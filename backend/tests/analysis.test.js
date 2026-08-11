const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');
const { cache } = require('../src/modules/weather/weather.service');
const { assessHour, adviceFor } = require('../src/modules/analysis/analysis.rules');
const {
	setupTestDatabase,
	truncateAll,
	closeTestDatabase,
} = require('./helpers/db');
const { createUser } = require('./helpers/auth');

const originalFetch = global.fetch;

const START = { lat: 21.028511, lon: 105.804817, grid: '21.03' };
const END = { lat: 20.844912, lon: 106.688087, grid: '20.84' };

const HOURS = 30;
const baseSeconds = () => Math.ceil(Date.now() / 3_600_000) * 3600;

const CLEAR = {
	temp: 25,
	precip: 0,
	precipProb: 5,
	humidity: 60,
	wind: 5,
	code: 0,
};

const STORM = {
	temp: 25,
	precip: 8,
	precipProb: 90,
	humidity: 95,
	wind: 45,
	code: 95,
};

const SHOWERS = {
	temp: 25,
	precip: 3,
	precipProb: 70,
	humidity: 85,
	wind: 25,
	code: 61,
};

const seriesPayload = (hourAt) => {
	const times = Array.from(
		{ length: HOURS },
		(_, index) => baseSeconds() + index * 3600
	);
	const rows = times.map((_, index) => hourAt(index));

	return {
		latitude: START.lat,
		longitude: START.lon,
		timezone: 'Asia/Bangkok',
		utc_offset_seconds: 25_200,
		hourly: {
			time: times,
			temperature_2m: rows.map((row) => row.temp),
			precipitation: rows.map((row) => row.precip),
			precipitation_probability: rows.map((row) => row.precipProb),
			relative_humidity_2m: rows.map((row) => row.humidity),
			wind_speed_10m: rows.map((row) => row.wind),
			weather_code: rows.map((row) => row.code),
		},
	};
};

const requestedUrls = [];

const stubWeather = (skies) => {
	global.fetch = async (url) => {
		requestedUrls.push(url);
		const latitude = new URL(url).searchParams.get('latitude');
		const hourAt = skies[latitude] ?? (() => CLEAR);

		return new Response(JSON.stringify(seriesPayload(hourAt)), {
			status: 200,
			headers: { 'content-type': 'application/json' },
		});
	};
};

const departAt = (hourOffset = 0) =>
	new Date((baseSeconds() + hourOffset * 3600) * 1000).toISOString();

const ask = (user, params) =>
	request(app)
		.get(`/api/analysis/risk?${new URLSearchParams(params)}`)
		.set(user.auth);

const businessUser = () => createUser({ accountType: 'business' });

test.before(setupTestDatabase);
test.beforeEach(async () => {
	await truncateAll();
	cache.clear();
	requestedUrls.length = 0;
	stubWeather({});
});
test.afterEach(() => {
	global.fetch = originalFetch;
});
test.after(closeTestDatabase);

test('scoring an hour is a sum of named thresholds', () => {
	const result = assessHour({
		temp: 25,
		precip: 8,
		precipProb: 90,
		humidity: 95,
		wind: 45,
		weatherCode: 95,
	});

	assert.equal(result.score, 93);
	assert.equal(result.band, 'severe');
	assert.deepEqual(
		result.rules.map((rule) => [rule.key, rule.points]),
		[
			['rain', 35],
			['thunderstorm', 30],
			['wind', 18],
			['rainChance', 10],
		]
	);
	assert.equal(result.rules[0].value, 8);
	assert.equal(result.rules[0].threshold, 7.6);
});

test('a ladder scores one step, not every step below it', () => {
	const heavy = assessHour({ precip: 8, precipProb: 0, wind: 0, temp: 20 });
	assert.deepEqual(
		heavy.rules.map((rule) => rule.key),
		['rain']
	);
	assert.equal(heavy.score, 35);
});

test('cold reads the ladder downwards', () => {
	assert.equal(assessHour({ temp: -3 }).rules[0].points, 12);
	assert.equal(assessHour({ temp: 4 }).rules[0].points, 5);
	assert.equal(assessHour({ temp: 20 }).rules.length, 0);
});

test('a missing measurement fires nothing rather than zero', () => {
	const result = assessHour({
		temp: null,
		precip: null,
		precipProb: null,
		wind: null,
		weatherCode: null,
	});

	assert.equal(result.score, 0);
	assert.deepEqual(result.rules, []);
});

test('the score cannot run past 100', () => {
	const result = assessHour({
		temp: -5,
		precip: 20,
		precipProb: 100,
		wind: 90,
		weatherCode: 75,
	});

	assert.equal(result.score, 100);
});

test('advice leads with the verdict and never repeats itself', () => {
	const { band, rules } = assessHour({
		precip: 8,
		precipProb: 90,
		weatherCode: 71,
		wind: 0,
		temp: 20,
	});

	const advice = adviceFor(band, rules);

	assert.equal(advice[0], 'postpone');
	assert.equal(new Set(advice).size, advice.length);
	assert.ok(advice.includes('icyRoad'));
});

test('risk analysis requires authentication', async () => {
	await request(app)
		.get(`/api/analysis/risk?lat=21&lon=105.8&depart_at=${departAt()}`)
		.expect(401);
});

test('risk analysis is closed to other account types', async () => {
	const individual = await createUser();

	const res = await ask(individual, {
		lat: START.lat,
		lon: START.lon,
		depart_at: departAt(),
	}).expect(403);

	assert.equal(res.body.error.code, 'WRONG_ACCOUNT_TYPE');
});

test('a calm hour scores nothing and suggests nothing', async () => {
	const user = await businessUser();

	const res = await ask(user, {
		lat: START.lat,
		lon: START.lon,
		depart_at: departAt(),
	}).expect(200);

	assert.equal(res.body.score, 0);
	assert.equal(res.body.band, 'low');
	assert.deepEqual(res.body.rules, []);
	assert.deepEqual(res.body.advice, ['goAsPlanned']);
	assert.equal(res.body.suggestion, null);
	assert.equal(res.body.points.length, 1);
	assert.equal(res.body.worstPoint, 'start');
	assert.equal(res.body.units.temp, '°C');
	assert.equal(res.body.outlook.length, 12);
});

test('the thresholds are metric whatever the reader uses', async () => {
	const user = await businessUser();

	await ask(user, {
		lat: START.lat,
		lon: START.lon,
		depart_at: departAt(),
	}).expect(200);

	const query = new URL(requestedUrls[0]).searchParams;
	assert.equal(query.get('temperature_unit'), 'celsius');
	assert.equal(query.get('wind_speed_unit'), 'kmh');
	assert.equal(query.get('precipitation_unit'), 'mm');
});

test('a trip is as risky as its worst end', async () => {
	const user = await businessUser();
	stubWeather({ [END.grid]: () => STORM });

	const res = await ask(user, {
		lat: START.lat,
		lon: START.lon,
		to_lat: END.lat,
		to_lon: END.lon,
		depart_at: departAt(),
	}).expect(200);

	assert.equal(res.body.points.length, 2);
	assert.equal(res.body.worstPoint, 'end');
	assert.equal(res.body.band, 'severe');
	assert.equal(res.body.score, 93);

	const start = res.body.points.find((point) => point.role === 'start');
	// The clear end is still reported — the caller can see where the risk is.
	assert.equal(start.score, 0);
	assert.equal(start.conditions.weatherCode, 0);
});

test('a storm that clears is answered with a later departure', async () => {
	const user = await businessUser();
	stubWeather({
		[START.grid]: (index) => {
			if (index === 0) return STORM;
			if (index < 3) return SHOWERS;
			return CLEAR;
		},
	});

	const res = await ask(user, {
		lat: START.lat,
		lon: START.lon,
		depart_at: departAt(),
	}).expect(200);

	assert.equal(res.body.band, 'severe');
	assert.equal(res.body.advice[0], 'postpone');

	assert.equal(res.body.suggestion.band, 'low');
	assert.equal(res.body.suggestion.score, 0);
	assert.equal(res.body.suggestion.at, new Date(departAt(3)).toISOString());

	assert.equal(res.body.outlook[0].score, 93);
	assert.equal(res.body.outlook[3].score, 0);
});

test('no calmer hour means no suggestion', async () => {
	const user = await businessUser();
	stubWeather({ [START.grid]: () => STORM });

	const res = await ask(user, {
		lat: START.lat,
		lon: START.lon,
		depart_at: departAt(),
	}).expect(200);

	assert.equal(res.body.suggestion, null);
});

test('a departure the forecast does not reach is refused', async () => {
	const user = await businessUser();

	const res = await ask(user, {
		lat: START.lat,
		lon: START.lon,
		depart_at: departAt(HOURS + 5),
	}).expect(400);

	assert.equal(res.body.error.code, 'OUTSIDE_FORECAST_WINDOW');
});

test('half a destination is not a destination', async () => {
	const user = await businessUser();

	await ask(user, {
		lat: START.lat,
		lon: START.lon,
		to_lat: END.lat,
		depart_at: departAt(),
	}).expect(400);
});

test('the same place twice is only asked about once', async () => {
	const user = await businessUser();

	const res = await ask(user, {
		lat: START.lat,
		lon: START.lon,
		to_lat: START.lat,
		to_lon: START.lon,
		depart_at: departAt(),
	}).expect(200);

	assert.equal(res.body.points.length, 1);
	assert.equal(requestedUrls.length, 1);
});
