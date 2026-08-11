const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');
const {
	setupTestDatabase,
	truncateAll,
	closeTestDatabase,
} = require('./helpers/db');
const { createUser } = require('./helpers/auth');

const HANOI = {
	custom_name: 'Home',
	latitude: 21.028511,
	longitude: 105.804817,
};

test.before(setupTestDatabase);
test.beforeEach(truncateAll);
test.after(closeTestDatabase);

test('a user can create and read back a location', async () => {
	const user = await createUser();

	const created = await request(app)
		.post('/api/locations')
		.set(user.auth)
		.send(HANOI)
		.expect(201);

	assert.equal(created.body.location.name, 'Home');
	assert.equal(created.body.location.latitude, 21.028511);
	assert.equal(typeof created.body.location.latitude, 'number');
	assert.ok(
		!Number.isNaN(Date.parse(created.body.location.createdAt)),
		'createdAt should be a real timestamp'
	);

	const listed = await request(app)
		.get('/api/locations')
		.set(user.auth)
		.expect(200);

	assert.equal(listed.body.locations.length, 1);
});

test('another user cannot read, edit or delete your location (BOLA)', async () => {
	const owner = await createUser();
	const stranger = await createUser();

	const created = await request(app)
		.post('/api/locations')
		.set(owner.auth)
		.send(HANOI)
		.expect(201);

	const id = created.body.location.id;

	await request(app).get(`/api/locations/${id}`).set(stranger.auth).expect(404);

	await request(app)
		.patch(`/api/locations/${id}`)
		.set(stranger.auth)
		.send({ custom_name: 'Hacked' })
		.expect(404);

	await request(app)
		.delete(`/api/locations/${id}`)
		.set(stranger.auth)
		.expect(404);

	const stillThere = await request(app)
		.get(`/api/locations/${id}`)
		.set(owner.auth)
		.expect(200);

	assert.equal(stillThere.body.location.name, 'Home');
});

test('coordinates outside the valid range are rejected', async () => {
	const user = await createUser();

	const res = await request(app)
		.post('/api/locations')
		.set(user.auth)
		.send({ ...HANOI, latitude: 120 })
		.expect(400);

	assert.equal(res.body.error.code, 'VALIDATION_ERROR');
	assert.ok(res.body.error.details.some((d) => d.field === 'latitude'));
});