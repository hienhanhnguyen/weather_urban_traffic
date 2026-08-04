const request = require('supertest');
const app = require('../../src/app');
const { User, Role } = require('../../src/shared/models');

let counter = 0;

async function createUser(overrides = {}) {
	counter += 1;
	const credentials = {
		email: `user${counter}@example.com`,
		password: 'correct-horse-1',
		...overrides,
	};

	const res = await request(app).post('/api/auth/signup').send(credentials);

	return {
		...credentials,
		id: res.body.user.id,
		accessToken: res.body.accessToken,
		auth: { Authorization: `Bearer ${res.body.accessToken}` },
	};
}

async function promoteToAdmin(user) {
	const record = await User.findByPk(user.id);
	const admin = await Role.findOne({ where: { name: 'admin' } });
	await record.addRole(admin);

	const res = await request(app)
		.post('/api/auth/signin')
		.send({ email: user.email, password: user.password });

	return {
		...user,
		accessToken: res.body.accessToken,
		auth: { Authorization: `Bearer ${res.body.accessToken}` },
	};
}

module.exports = { createUser, promoteToAdmin };