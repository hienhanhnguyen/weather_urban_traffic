const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');

test('GET /healthz should return 200 OK with a status field', async () => {
	const res = await request(app).get('/healthz');
	assert.strictEqual(res.status, 200);
	assert.ok(res.body.status);
});

test('GET /healthz responds without a database', async () => {
	const res = await request(app).get('/healthz');
	assert.strictEqual(res.status, 200);
	assert.strictEqual(res.body.status, 'ok');
	assert.ok(res.body.uptime);
	assert.ok(res.body.timestamp);
});
