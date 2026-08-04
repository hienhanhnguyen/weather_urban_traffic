const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');
const {
	setupTestDatabase,
	truncateAll,
	closeTestDatabase,
} = require('./helpers/db');
const { createUser, promoteToAdmin } = require('./helpers/auth');

test.before(setupTestDatabase);
test.beforeEach(truncateAll);
test.after(closeTestDatabase);

test('PATCH /users/me cannot change roles, email or account type', async () => {
	const user = await createUser();

	const res = await request(app)
		.patch('/api/users/me')
		.set(user.auth)
		.send({
			username: 'ada',
			email: 'attacker@example.com',
			roles: ['admin'],
			account_type: 'admin_officer',
		})
		.expect(200);

	assert.equal(res.body.user.username, 'ada');
	assert.equal(res.body.user.email, user.email);
	assert.deepEqual(res.body.user.roles, ['user']);
	assert.equal(res.body.user.accountType, 'individual');
});

test('preferences are created on first read with sane defaults', async () => {
	const user = await createUser();

	const res = await request(app)
		.get('/api/users/me/preferences')
		.set(user.auth)
		.expect(200);

	assert.equal(res.body.preferences.language, 'en');
	assert.equal(res.body.preferences.minSeverity, 'info');
	assert.equal(res.body.preferences.emailAlertsEnabled, true);

	const updated = await request(app)
		.put('/api/users/me/preferences')
		.set(user.auth)
		.send({ min_severity: 'critical', email_alerts_enabled: false })
		.expect(200);

	assert.equal(updated.body.preferences.minSeverity, 'critical');
	assert.equal(updated.body.preferences.emailAlertsEnabled, false);
});

test('only an admin may list users or change roles', async () => {
	const plain = await createUser();
	const target = await createUser();

	await request(app).get('/api/users').set(plain.auth).expect(403);

	await request(app)
		.put(`/api/users/${target.id}/roles`)
		.set(plain.auth)
		.send({ roles: ['admin'] })
		.expect(403);

	const admin = await promoteToAdmin(await createUser());

	await request(app).get('/api/users').set(admin.auth).expect(200);

	const promoted = await request(app)
		.put(`/api/users/${target.id}/roles`)
		.set(admin.auth)
		.send({ roles: ['user', 'moderator'] })
		.expect(200);

	assert.deepEqual(promoted.body.user.roles.sort(), ['moderator', 'user']);
});

test('an admin cannot change their own roles', async () => {
	const admin = await promoteToAdmin(await createUser());

	const res = await request(app)
		.put(`/api/users/${admin.id}/roles`)
		.set(admin.auth)
		.send({ roles: ['user'] })
		.expect(403);

	assert.equal(res.body.error.code, 'SELF_ROLE_CHANGE');
});