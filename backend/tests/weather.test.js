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
	await request(app)
		.get('/api/weather/current?lat=21&lon=105.8')
		.expect(401);
});

test('a second identical request is served from cache', async () => {
	const user = await createUser();
	let calls = 0;

	stubFetch(async () => {
		calls += 1;
		return new Response(JSON.stringify({ main: { temp: 30 } }), {
			status: 200,
			headers: { 'content-type': 'application/json' },
		});
	});

	await request(app)
		.get('/api/weather/current?lat=21.0285&lon=105.8048')
		.set(user.auth)
		.expect(200);

	await request(app)
		.get('/api/weather/current?lat=21.0288&lon=105.8041')
		.set(user.auth)
		.expect(200);

	assert.equal(calls, 1);
});

test('an upstream auth failure becomes a 503, not a 401', async () => {
	const user = await createUser();

	stubFetch(async () =>
		new Response(JSON.stringify({ message: 'Invalid API key' }), {
			status: 401,
			headers: { 'content-type': 'application/json' },
		})
	);

	const res = await request(app)
		.get('/api/weather/current?lat=10&lon=100')
		.set(user.auth)
		.expect(503);

	assert.equal(res.body.error.code, 'SERVICE_UNAVAILABLE');
	assert.equal(res.body.error.message.includes('Invalid API key'), false);
});

test('out-of-range coordinates are rejected before any upstream call', async () => {
	const user = await createUser();
	let calls = 0;
	stubFetch(async () => {
		calls += 1;
		return new Response('{}', { status: 200 });
	});

	await request(app)
		.get('/api/weather/current?lat=999&lon=105')
		.set(user.auth)
		.expect(400);

	assert.equal(calls, 0);
});