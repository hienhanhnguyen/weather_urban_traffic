const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');
const { RouteSearch, WeatherSearch } = require('../src/shared/models');
const {
	setupTestDatabase,
	truncateAll,
	closeTestDatabase,
} = require('./helpers/db');
const { createUser } = require('./helpers/auth');

const TRIP = {
	name: 'Commute',
	start: { latitude: 21.028511, longitude: 105.804817, address: 'Hanoi' },
	end: { latitude: 20.844912, longitude: 106.688087, address: 'Hai Phong' },
	profile: 'driving',
	distance_m: 102_000,
	duration_s: 7_200,
};

const { name, ...SEARCH } = TRIP;

test.before(setupTestDatabase);
test.beforeEach(truncateAll);
test.after(closeTestDatabase);

test('a user can save a route and read it back', async () => {
	const user = await createUser();

	const created = await request(app)
		.post('/api/routes')
		.set(user.auth)
		.send(TRIP)
		.expect(201);

	const { route } = created.body;
	assert.equal(route.name, 'Commute');
	assert.equal(route.start.latitude, 21.028511);
	assert.equal(typeof route.start.latitude, 'number');
	assert.equal(route.end.address, 'Hai Phong');
	assert.equal(route.profile, 'driving');
	assert.equal(route.distanceM, 102_000);
	assert.deepEqual(created.body.locations, []);

	const listed = await request(app)
		.get('/api/routes')
		.set(user.auth)
		.expect(200);

	assert.equal(listed.body.routes.length, 1);
	assert.equal(listed.body.pagination.total, 1);
});

test('saving the endpoints creates two locations alert rules can attach to', async () => {
	const user = await createUser();

	const created = await request(app)
		.post('/api/routes')
		.set(user.auth)
		.send({
			...TRIP,
			save_endpoints: { start_name: 'Nha', end_name: 'Cong ty' },
		})
		.expect(201);

	assert.equal(created.body.locations.length, 2);
	assert.equal(created.body.locations[0].name, 'Nha');
	assert.equal(created.body.locations[1].latitude, 20.844912);

	const locations = await request(app)
		.get('/api/locations')
		.set(user.auth)
		.expect(200);

	assert.equal(locations.body.locations.length, 2);

	await request(app)
		.post('/api/alerts/rules')
		.set(user.auth)
		.send({
			location_id: created.body.locations[0].id,
			metric: 'temp',
			operator: '>',
			threshold: 35,
		})
		.expect(201);
});

test('another user cannot read, edit or delete your route (BOLA)', async () => {
	const owner = await createUser();
	const stranger = await createUser();

	const created = await request(app)
		.post('/api/routes')
		.set(owner.auth)
		.send(TRIP)
		.expect(201);

	const id = created.body.route.id;

	await request(app).get(`/api/routes/${id}`).set(stranger.auth).expect(404);
	await request(app)
		.patch(`/api/routes/${id}`)
		.set(stranger.auth)
		.send({ name: 'Stolen' })
		.expect(404);
	await request(app).delete(`/api/routes/${id}`).set(stranger.auth).expect(404);

	const still = await request(app)
		.get(`/api/routes/${id}`)
		.set(owner.auth)
		.expect(200);

	assert.equal(still.body.route.name, 'Commute');
});

test('a route can be renamed and rerouted', async () => {
	const user = await createUser();

	const created = await request(app)
		.post('/api/routes')
		.set(user.auth)
		.send(TRIP)
		.expect(201);

	const updated = await request(app)
		.patch(`/api/routes/${created.body.route.id}`)
		.set(user.auth)
		.send({
			name: 'Weekend ride',
			profile: 'cycling',
			end: { latitude: 20.9, longitude: 106.7, address: 'Do Son' },
		})
		.expect(200);

	assert.equal(updated.body.route.name, 'Weekend ride');
	assert.equal(updated.body.route.profile, 'cycling');
	assert.equal(updated.body.route.end.address, 'Do Son');
	// Untouched half stays put.
	assert.equal(updated.body.route.start.address, 'Hanoi');
});

test('an empty patch is rejected', async () => {
	const user = await createUser();

	const created = await request(app)
		.post('/api/routes')
		.set(user.auth)
		.send(TRIP)
		.expect(201);

	await request(app)
		.patch(`/api/routes/${created.body.route.id}`)
		.set(user.auth)
		.send({})
		.expect(400);
});

test('repeating the same search bumps the entry instead of duplicating it', async () => {
	const user = await createUser();

	const first = await request(app)
		.post('/api/history/routes')
		.set(user.auth)
		.send(SEARCH)
		.expect(201);

	const second = await request(app)
		.post('/api/history/routes')
		.set(user.auth)
		.send(SEARCH)
		.expect(201);

	assert.equal(second.body.search.id, first.body.search.id);
	assert.ok(
		Date.parse(second.body.search.searchedAt) >=
		Date.parse(first.body.search.searchedAt),
		'the repeat should move the entry forward in time'
	);

	// A different travel profile is a different search.
	await request(app)
		.post('/api/history/routes')
		.set(user.auth)
		.send({ ...SEARCH, profile: 'cycling' })
		.expect(201);

	const listed = await request(app)
		.get('/api/history/routes')
		.set(user.auth)
		.expect(200);

	assert.equal(listed.body.pagination.total, 2);
});

test('a search outside the dedupe window becomes its own entry', async () => {
	const user = await createUser();

	const first = await request(app)
		.post('/api/history/routes')
		.set(user.auth)
		.send(SEARCH)
		.expect(201);

	await RouteSearch.update(
		{ searched_at: new Date('2026-03-01T08:00:00Z') },
		{ where: { search_id: first.body.search.id } }
	);

	const second = await request(app)
		.post('/api/history/routes')
		.set(user.auth)
		.send(SEARCH)
		.expect(201);

	assert.notEqual(second.body.search.id, first.body.search.id);

	const listed = await request(app)
		.get('/api/history/routes')
		.set(user.auth)
		.expect(200);

	assert.equal(listed.body.pagination.total, 2);
	// Newest first.
	assert.equal(listed.body.searches[0].id, second.body.search.id);
});

test('route history can be narrowed by date and cleared', async () => {
	const user = await createUser();

	const seed = async (profile, searchedAt) => {
		const created = await request(app)
			.post('/api/history/routes')
			.set(user.auth)
			.send({ ...SEARCH, profile })
			.expect(201);

		await RouteSearch.update(
			{ searched_at: new Date(searchedAt) },
			{ where: { search_id: created.body.search.id } }
		);
	};

	await seed('driving', '2026-03-01T08:00:00Z');
	await seed('cycling', '2026-03-05T08:00:00Z');
	await seed('walking', '2026-03-10T08:00:00Z');

	const window = await request(app)
		.get('/api/history/routes')
		.query({ from: '2026-03-04T00:00:00Z', to: '2026-03-06T00:00:00Z' })
		.set(user.auth)
		.expect(200);

	assert.equal(window.body.pagination.total, 1);
	assert.equal(window.body.searches[0].profile, 'cycling');

	await request(app)
		.get('/api/history/routes')
		.query({ from: '2026-03-06T00:00:00Z', to: '2026-03-04T00:00:00Z' })
		.set(user.auth)
		.expect(400);

	const cleared = await request(app)
		.delete('/api/history/routes')
		.set(user.auth)
		.expect(200);

	assert.equal(cleared.body.deleted, 3);

	const empty = await request(app)
		.get('/api/history/routes')
		.set(user.auth)
		.expect(200);

	assert.equal(empty.body.pagination.total, 0);
});

test('clearing your history leaves other accounts alone', async () => {
	const owner = await createUser();
	const stranger = await createUser();

	await request(app)
		.post('/api/history/routes')
		.set(owner.auth)
		.send(SEARCH)
		.expect(201);
	await request(app)
		.post('/api/history/routes')
		.set(stranger.auth)
		.send(SEARCH)
		.expect(201);

	const cleared = await request(app)
		.delete('/api/history/routes')
		.set(owner.auth)
		.expect(200);

	assert.equal(cleared.body.deleted, 1);

	const theirs = await request(app)
		.get('/api/history/routes')
		.set(stranger.auth)
		.expect(200);

	assert.equal(theirs.body.pagination.total, 1);
});

test('a weather lookup survives deleting the saved location it came from', async () => {
	const user = await createUser();

	const location = await request(app)
		.post('/api/locations')
		.set(user.auth)
		.send({ custom_name: 'Home', latitude: 21.028511, longitude: 105.804817 })
		.expect(201);

	const recorded = await request(app)
		.post('/api/history/weather')
		.set(user.auth)
		.send({
			location_id: location.body.location.id,
			label: 'Home',
			latitude: 21.028511,
			longitude: 105.804817,
			temperature_c: 31.5,
			condition: 'Light rain',
		})
		.expect(201);

	assert.equal(recorded.body.search.locationId, location.body.location.id);
	assert.equal(recorded.body.search.temperatureC, 31.5);

	await request(app)
		.delete(`/api/locations/${location.body.location.id}`)
		.set(user.auth)
		.expect(204);

	const listed = await request(app)
		.get('/api/history/weather')
		.set(user.auth)
		.expect(200);

	assert.equal(listed.body.pagination.total, 1);
	assert.equal(listed.body.searches[0].locationId, null);
	assert.equal(listed.body.searches[0].label, 'Home');
	assert.equal(listed.body.searches[0].latitude, 21.028511);
});

test('a weather lookup cannot be attached to somebody else location', async () => {
	const owner = await createUser();
	const stranger = await createUser();

	const location = await request(app)
		.post('/api/locations')
		.set(owner.auth)
		.send({ custom_name: 'Home', latitude: 21.028511, longitude: 105.804817 })
		.expect(201);

	await request(app)
		.post('/api/history/weather')
		.set(stranger.auth)
		.send({
			location_id: location.body.location.id,
			label: 'Home',
			latitude: 21.028511,
			longitude: 105.804817,
		})
		.expect(404);

	assert.equal(await WeatherSearch.count(), 0);
});

test('looking the same place up twice keeps one weather history entry', async () => {
	const user = await createUser();

	const body = {
		label: 'Hanoi',
		latitude: 21.028511,
		longitude: 105.804817,
		temperature_c: 30,
	};

	const first = await request(app)
		.post('/api/history/weather')
		.set(user.auth)
		.send(body)
		.expect(201);

	const second = await request(app)
		.post('/api/history/weather')
		.set(user.auth)
		.send({ ...body, temperature_c: 33.2, condition: 'Sunny' })
		.expect(201);

	assert.equal(second.body.search.id, first.body.search.id);
	assert.equal(second.body.search.temperatureC, 33.2);
	assert.equal(second.body.search.condition, 'Sunny');

	const listed = await request(app)
		.get('/api/history/weather')
		.set(user.auth)
		.expect(200);

	assert.equal(listed.body.pagination.total, 1);
});

test('history and routes both require a signed-in user', async () => {
	await request(app).get('/api/routes').expect(401);
	await request(app).get('/api/history/routes').expect(401);
	await request(app).get('/api/history/weather').expect(401);
});
