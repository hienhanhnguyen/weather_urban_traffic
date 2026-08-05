const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');
const { User, Role, OtpCode } = require('../src/shared/models');
const { sha256 } = require('../src/modules/auth/auth.tokens');
const {
	setupTestDatabase,
	truncateAll,
	closeTestDatabase,
} = require('./helpers/db');

const CREDENTIALS = { email: 'ada@example.com', password: 'correct-horse-1' };

const signUp = (body = {}) =>
	request(app).post('/api/auth/signup').send({ ...CREDENTIALS, ...body });

test.before(setupTestDatabase);
test.beforeEach(truncateAll);
test.after(closeTestDatabase);

test('signup ignores a roles field in the request body (C2)', async () => {
	const res = await signUp({ roles: ['admin'], account_type: 'admin_officer' });

	assert.equal(res.status, 201);
	assert.deepEqual(res.body.user.roles, ['user']);
	assert.equal(res.body.user.accountType, 'individual');
});

test('no response body ever contains a password hash', async () => {
	const res = await signUp();
	assert.equal(JSON.stringify(res.body).includes('password_hash'), false);
	assert.equal(JSON.stringify(res.body).includes('$2b$'), false);
});

test('unknown email and wrong password are indistinguishable', async () => {
	await signUp();

	const wrongPassword = await request(app)
		.post('/api/auth/signin')
		.send({ email: CREDENTIALS.email, password: 'not-the-password' });

	const unknownEmail = await request(app)
		.post('/api/auth/signin')
		.send({ email: 'nobody@example.com', password: 'not-the-password' });

	assert.equal(wrongPassword.status, 401);
	assert.equal(unknownEmail.status, 401);
	const shape = ({ error }) => ({ code: error.code, message: error.message });
	assert.deepEqual(shape(wrongPassword.body), shape(unknownEmail.body));
	assert.notEqual(wrongPassword.body.error.requestId, undefined);
});

test('an account with no password cannot be signed into (C3)', async () => {
	const role = await Role.findOne({ where: { name: 'user' } });
	const user = await User.create({
		email: 'oauth@example.com',
		password_hash: null,
	});
	await user.addRole(role);

	const res = await request(app)
		.post('/api/auth/signin')
		.send({ email: 'oauth@example.com', password: '123456' });

	assert.equal(res.status, 401);
});

test('password reset requires a valid reset token (C1)', async () => {
	await signUp();

	const res = await request(app)
		.post('/api/auth/password/reset')
		.send({ resetToken: 'forged-token', newPassword: 'attacker-chosen-1' });

	assert.equal(res.status, 401);

	const stillWorks = await request(app)
		.post('/api/auth/signin')
		.send(CREDENTIALS);
	assert.equal(stillWorks.status, 200);
});

test('full reset flow rotates the password and kills old sessions', async () => {
	const created = await signUp();
	const oldRefresh = created.body.refreshToken;

	await request(app)
		.post('/api/auth/password/forgot')
		.send({ email: CREDENTIALS.email })
		.expect(202);

	const user = await User.findOne({ where: { email: CREDENTIALS.email } });
	const otp = await OtpCode.findOne({ where: { user_id: user.user_id } });

	const code = ['000000']
		.concat(
			Array.from({ length: 1000000 }, (_, i) =>
				String(i).padStart(6, '0')
			)
		)
		.find((candidate) => sha256(candidate) === otp.code_hash);

	const verified = await request(app)
		.post('/api/auth/password/verify-otp')
		.send({ email: CREDENTIALS.email, code })
		.expect(200);

	await request(app)
		.post('/api/auth/password/reset')
		.send({
			resetToken: verified.body.resetToken,
			newPassword: 'a-brand-new-password',
		})
		.expect(200);

	await request(app)
		.post('/api/auth/refresh')
		.send({ refreshToken: oldRefresh })
		.expect(401);

	await request(app)
		.post('/api/auth/signin')
		.send({ email: CREDENTIALS.email, password: 'a-brand-new-password' })
		.expect(200);
});

test('refresh rotates: the old token stops working', async () => {
	const created = await signUp();
	const first = created.body.refreshToken;

	const rotated = await request(app)
		.post('/api/auth/refresh')
		.send({ refreshToken: first })
		.expect(200);

	assert.notEqual(rotated.body.refreshToken, first);

	await request(app)
		.post('/api/auth/refresh')
		.send({ refreshToken: first })
		.expect(401);
});

test('replaying a revoked refresh token revokes the whole family', async () => {
	const created = await signUp();
	const first = created.body.refreshToken;

	const rotated = await request(app)
		.post('/api/auth/refresh')
		.send({ refreshToken: first })
		.expect(200);

	const reuse = await request(app)
		.post('/api/auth/refresh')
		.send({ refreshToken: first });

	assert.equal(reuse.status, 401);
	assert.equal(reuse.body.error.code, 'REFRESH_TOKEN_REUSED');

	await request(app)
		.post('/api/auth/refresh')
		.send({ refreshToken: rotated.body.refreshToken })
		.expect(401);
});

test('missing token is 401, valid token with wrong role is 403', async () => {
	await request(app).get('/api/auth/me').expect(401);

	const created = await signUp();
	await request(app)
		.get('/api/auth/me')
		.set('Authorization', `Bearer ${created.body.accessToken}`)
		.expect(200);
});

const findOtpCode = (hash) => {
	for (let i = 0; i < 1_000_000; i += 1) {
		const candidate = String(i).padStart(6, '0');
		if (sha256(candidate) === hash) return candidate;
	}
	throw new Error('could not recover OTP from hash');
};

test('otp attempts are counted and the code dies after the limit', async () => {
	await signUp();
	await request(app)
		.post('/api/auth/password/forgot')
		.send({ email: CREDENTIALS.email })
		.expect(202);

	const user = await User.findOne({ where: { email: CREDENTIALS.email } });
	const otp = await OtpCode.findOne({ where: { user_id: user.user_id } });
	const realCode = findOtpCode(otp.code_hash);
	const wrongCode = realCode === '000000' ? '111111' : '000000';

	for (let i = 0; i < 5; i += 1) {
		await request(app)
			.post('/api/auth/password/verify-otp')
			.send({ email: CREDENTIALS.email, code: wrongCode })
			.expect(401);
	}

	await otp.reload();
	assert.equal(otp.attempts, 5);
	assert.notEqual(otp.consumed_at, null);

	await request(app)
		.post('/api/auth/password/verify-otp')
		.send({ email: CREDENTIALS.email, code: realCode })
		.expect(401);
});