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

const ring = (west, south, size = 0.1) => [
	[west, south],
	[west + size, south],
	[west + size, south + size],
	[west, south + size],
	[west, south],
];

const boundary = (west = 105.8, south = 21.0) => ({
	type: 'Polygon',
	coordinates: [ring(west, south)],
});

const AREA = {
	name: 'Hoàn Kiếm',
	area_type: 'district',
	address: 'Hà Nội',
	boundary: boundary(),
};

const officer = async () => promoteToAdmin(await createUser());

test.before(setupTestDatabase);
test.beforeEach(truncateAll);
test.after(closeTestDatabase);

test('an officer can draw an area and read it back', async () => {
	const user = await officer();

	const created = await request(app)
		.post('/api/gov/areas')
		.set(user.auth)
		.send(AREA)
		.expect(201);

	const area = created.body.area;

	assert.equal(area.name, 'Hoàn Kiếm');
	assert.equal(area.areaType, 'district');
	assert.deepEqual(area.boundary, AREA.boundary);

	assert.ok(Math.abs(area.center.latitude - 21.05) < 1e-6);
	assert.ok(Math.abs(area.center.longitude - 105.85) < 1e-6);
	assert.ok(area.areaKm2 > 110 && area.areaKm2 < 120, `got ${area.areaKm2}`);

	const listed = await request(app)
		.get('/api/gov/areas')
		.set(user.auth)
		.expect(200);

	assert.equal(listed.body.areas.length, 1);
	assert.equal(listed.body.areas[0].id, area.id);
});

test('an ordinary account cannot reach the area endpoints', async () => {
	const user = await createUser();

	await request(app).get('/api/gov/areas').expect(401);

	await request(app).get('/api/gov/areas').set(user.auth).expect(403);

	await request(app)
		.post('/api/gov/areas')
		.set(user.auth)
		.send(AREA)
		.expect(403);
});

test('a boundary that crosses itself is refused with a code the UI can read', async () => {
	const user = await officer();

	const bowtie = {
		type: 'Polygon',
		coordinates: [
			[
				[105.8, 21.0],
				[105.9, 21.1],
				[105.9, 21.0],
				[105.8, 21.1],
				[105.8, 21.0],
			],
		],
	};

	const res = await request(app)
		.post('/api/gov/areas')
		.set(user.auth)
		.send({ ...AREA, boundary: bowtie })
		.expect(400);

	assert.equal(res.body.error.code, 'RING_SELF_INTERSECTS');
});

test('a boundary that never closes is refused', async () => {
	const user = await officer();

	const open = {
		type: 'Polygon',
		coordinates: [ring(105.8, 21.0).slice(0, -1).concat([[105.81, 21.02]])],
	};

	const res = await request(app)
		.post('/api/gov/areas')
		.set(user.auth)
		.send({ ...AREA, boundary: open })
		.expect(400);

	assert.equal(res.body.error.code, 'RING_NOT_CLOSED');
});

test('a ring with fewer than three corners never reaches the geometry check', async () => {
	const user = await officer();

	await request(app)
		.post('/api/gov/areas')
		.set(user.auth)
		.send({
			...AREA,
			boundary: {
				type: 'Polygon',
				coordinates: [
					[
						[105.8, 21.0],
						[105.9, 21.0],
						[105.8, 21.0],
					],
				],
			},
		})
		.expect(400);
});

test('two areas of one officer cannot share a name', async () => {
	const user = await officer();

	await request(app)
		.post('/api/gov/areas')
		.set(user.auth)
		.send(AREA)
		.expect(201);

	const res = await request(app)
		.post('/api/gov/areas')
		.set(user.auth)
		.send({ ...AREA, boundary: boundary(106.0, 21.0) })
		.expect(409);

	assert.equal(res.body.error.code, 'AREA_NAME_TAKEN');
});

test('editing the boundary moves the centre and the size with it', async () => {
	const user = await officer();

	const created = await request(app)
		.post('/api/gov/areas')
		.set(user.auth)
		.send(AREA)
		.expect(201);

	const updated = await request(app)
		.patch(`/api/gov/areas/${created.body.area.id}`)
		.set(user.auth)
		.send({ name: 'Ba Đình', boundary: boundary(106.0, 20.0) })
		.expect(200);

	assert.equal(updated.body.area.name, 'Ba Đình');
	assert.ok(Math.abs(updated.body.area.center.longitude - 106.05) < 1e-6);
	assert.ok(Math.abs(updated.body.area.center.latitude - 20.05) < 1e-6);
});

test('a rename leaves the geometry untouched', async () => {
	const user = await officer();

	const created = await request(app)
		.post('/api/gov/areas')
		.set(user.auth)
		.send(AREA)
		.expect(201);

	const updated = await request(app)
		.patch(`/api/gov/areas/${created.body.area.id}`)
		.set(user.auth)
		.send({ name: 'Tây Hồ' })
		.expect(200);

	assert.deepEqual(updated.body.area.boundary, AREA.boundary);
	assert.equal(updated.body.area.areaKm2, created.body.area.areaKm2);
});

test('one officer cannot read, edit or delete another officer area (BOLA)', async () => {
	const owner = await officer();
	const stranger = await officer();

	const created = await request(app)
		.post('/api/gov/areas')
		.set(owner.auth)
		.send(AREA)
		.expect(201);

	const id = created.body.area.id;

	await request(app).get(`/api/gov/areas/${id}`).set(stranger.auth).expect(404);

	await request(app)
		.patch(`/api/gov/areas/${id}`)
		.set(stranger.auth)
		.send({ name: 'Mine now' })
		.expect(404);

	await request(app)
		.delete(`/api/gov/areas/${id}`)
		.set(stranger.auth)
		.expect(404);

	const listed = await request(app)
		.get('/api/gov/areas')
		.set(stranger.auth)
		.expect(200);

	assert.equal(listed.body.areas.length, 0);
});

test('deleting an area removes it from the list', async () => {
	const user = await officer();

	const created = await request(app)
		.post('/api/gov/areas')
		.set(user.auth)
		.send(AREA)
		.expect(201);

	await request(app)
		.delete(`/api/gov/areas/${created.body.area.id}`)
		.set(user.auth)
		.expect(204);

	const listed = await request(app)
		.get('/api/gov/areas')
		.set(user.auth)
		.expect(200);

	assert.equal(listed.body.areas.length, 0);
});
