const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');
const { readOutbox } = require('../src/shared/mailer');
const {
	setupTestDatabase,
	truncateAll,
	closeTestDatabase,
} = require('./helpers/db');
const { createUser } = require('./helpers/auth');

test.before(setupTestDatabase);
test.beforeEach(truncateAll);
test.after(closeTestDatabase);

test('a password reset request sends exactly one code', async () => {
	const user = await createUser();

	await request(app)
		.post('/api/auth/password/forgot')
		.send({ email: user.email })
		.expect(202);

	const outbox = readOutbox();
	assert.equal(outbox.length, 1);
	assert.equal(outbox[0].to, user.email);
	assert.match(outbox[0].text, /\b\d{6}\b/);
});

test('an unknown address sends nothing but still returns 202', async () => {
	await request(app)
		.post('/api/auth/password/forgot')
		.send({ email: 'nobody@example.com' })
		.expect(202);

	assert.equal(readOutbox().length, 0);
});