const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const request = require('supertest');

const app = require('../src/app');
const { ForbiddenError } = require('../src/shared/errors');
const { notFoundHandler, errorHandler } = require('../src/shared/error.handler');

const buildAppThatThrows = (err) => {
	const testApp = express();
	testApp.get('/boom', () => {
		throw err;
	});
	testApp.use(notFoundHandler);
	testApp.use(errorHandler);
	return testApp;
};

test('unknown routes return a JSON 404', async () => {
	const res = await request(app).get('/not-a-route');

	assert.strictEqual(res.status, 404);
	assert.match(res.headers['content-type'], /application\/json/);
	assert.strictEqual(res.body.error.code, 'NOT_FOUND');
});

test('an operational error keeps its status, code and message', async () => {
	const err = new ForbiddenError('not your resource');
	const res = await request(buildAppThatThrows(err)).get('/boom');

	assert.strictEqual(res.status, 403);
	assert.strictEqual(res.body.error.code, 'FORBIDDEN');
	assert.strictEqual(res.body.error.message, 'not your resource');
});

test('an unexpected error becomes a generic 500 and leaks nothing', async () => {
	const err = new TypeError('user.save is not a function');
	const res = await request(buildAppThatThrows(err)).get('/boom');

	assert.strictEqual(res.status, 500);
	assert.strictEqual(res.body.error.code, 'INTERNAL_ERROR');

	const raw = JSON.stringify(res.body);
	assert.ok(!raw.includes('TypeError'));
	assert.ok(!raw.includes('is not a function'));
	assert.ok(!raw.includes('at '));
});