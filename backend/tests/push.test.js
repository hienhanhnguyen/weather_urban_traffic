const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');
const { PushSubscription } = require('../src/shared/models');
const {
	setupTestDatabase,
	truncateAll,
	closeTestDatabase,
} = require('./helpers/db');
const { createUser } = require('./helpers/auth');

const SUBSCRIPTION = {
	endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
	keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
	user_agent: 'Firefox/140',
};

test.before(setupTestDatabase);
test.beforeEach(truncateAll);
test.after(closeTestDatabase);

test('the public key endpoint never leaks the private half', async () => {
	const user = await createUser();

	const response = await request(app)
		.get('/api/alerts/push-subscriptions/public-key')
		.set(user.auth)
		.expect(200);

	assert.deepEqual(Object.keys(response.body).sort(), [
		'enabled',
		'publicKey',
	]);
	assert.equal(typeof response.body.enabled, 'boolean');
	assert.equal(typeof response.body.publicKey, 'string');
	assert.doesNotMatch(JSON.stringify(response.body), /private/i);
});

test('the public key endpoint requires a session', async () => {
	await request(app)
		.get('/api/alerts/push-subscriptions/public-key')
		.expect(401);
});

test('subscribing twice with the same endpoint does not duplicate', async () => {
	const user = await createUser();

	await request(app)
		.post('/api/alerts/push-subscriptions')
		.set(user.auth)
		.send(SUBSCRIPTION)
		.expect(201);

	await request(app)
		.post('/api/alerts/push-subscriptions')
		.set(user.auth)
		.send({ ...SUBSCRIPTION, keys: { p256dh: 'rotated', auth: 'rotated' } })
		.expect(201);

	const rows = await PushSubscription.findAll({ where: { user_id: user.id } });
	assert.equal(rows.length, 1);
	assert.equal(rows[0].p256dh, 'rotated');
});

test('a non-https endpoint is rejected', async () => {
	const user = await createUser();

	await request(app)
		.post('/api/alerts/push-subscriptions')
		.set(user.auth)
		.send({ ...SUBSCRIPTION, endpoint: 'http://evil.example/hook' })
		.expect(400);
});

test('you cannot delete another user subscription', async () => {
	const owner = await createUser();
	const stranger = await createUser();

	const created = await request(app)
		.post('/api/alerts/push-subscriptions')
		.set(owner.auth)
		.send(SUBSCRIPTION)
		.expect(201);

	await request(app)
		.delete(`/api/alerts/push-subscriptions/${created.body.subscription.id}`)
		.set(stranger.auth)
		.expect(404);

	assert.equal(await PushSubscription.count(), 1);
});