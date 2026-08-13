const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');
const { cache } = require('../src/modules/geo/geo.service');
const {
	setupTestDatabase,
	truncateAll,
	closeTestDatabase,
} = require('./helpers/db');
const { createUser } = require('./helpers/auth');

const originalFetch = global.fetch;

const stubFetch = (impl) => {
	global.fetch = impl;
};

const json = (payload) => ({
	ok: true,
	status: 200,
	json: async () => payload,
});

const photonFeature = (overrides = {}) => ({
	type: 'Feature',
	geometry: { type: 'Point', coordinates: [106.698, 10.772] },
	properties: {
		osm_type: 'W',
		osm_id: 39514795,
		osm_key: 'amenity',
		name: 'Chợ Bến Thành',
		street: 'Công trường Quách Thị Trang',
		district: 'Bến Thành',
		city: 'Thành phố Hồ Chí Minh',
		country: 'Việt Nam',
		...overrides,
	},
});

test.before(setupTestDatabase);
test.beforeEach(async () => {
	await truncateAll();
	cache.clear();
});
test.afterEach(() => {
	global.fetch = originalFetch;
});
test.after(closeTestDatabase);

test('geo endpoints require authentication', async () => {
	await request(app).get('/api/geo/search?q=ben+thanh').expect(401);
	await request(app).get('/api/geo/reverse?lat=10.7&lng=106.7').expect(401);
	await request(app)
		.get('/api/geo/route?fromLat=10.7&fromLng=106.7&toLat=10.8&toLng=106.6')
		.expect(401);
});

test('search flattens the provider response into our own shape', async () => {
	const user = await createUser();

	stubFetch(async () =>
		json({ type: 'FeatureCollection', features: [photonFeature()] })
	);

	const res = await request(app)
		.get('/api/geo/search?q=ben thanh&lat=10.82&lng=106.63')
		.set(user.auth)
		.expect(200);

	assert.equal(res.body.places.length, 1);
	assert.deepEqual(res.body.places[0], {
		id: 'W39514795',
		name: 'Chợ Bến Thành',
		address:
			'Công trường Quách Thị Trang, Bến Thành, Thành phố Hồ Chí Minh, Việt Nam',
		latitude: 10.772,
		longitude: 106.698,
		category: 'amenity',
	});

	// Nothing provider-specific leaks through.
	const serialised = JSON.stringify(res.body);
	assert.ok(!serialised.includes('osm_id'));
	assert.ok(!serialised.includes('geometry'));
});

test('search passes the focus point upstream and caches the answer', async () => {
	const user = await createUser();
	const urls = [];

	stubFetch(async (url) => {
		urls.push(url);
		return json({ features: [photonFeature()] });
	});

	const first = await request(app)
		.get('/api/geo/search?q=ben thanh&lat=10.8231&lng=106.6297')
		.set(user.auth)
		.expect(200);

	const second = await request(app)
		.get('/api/geo/search?q=ben thanh&lat=10.8231&lng=106.6297')
		.set(user.auth)
		.expect(200);

	assert.equal(urls.length, 1, 'the second request should be served from cache');
	assert.deepEqual(second.body, first.body);

	const url = new URL(urls[0]);
	assert.equal(url.searchParams.get('q'), 'ben thanh');
	// Rounded, so nearby focus points share a cache entry.
	assert.equal(url.searchParams.get('lat'), '10.82');
	assert.equal(url.searchParams.get('lon'), '106.63');
	assert.equal(url.searchParams.get('limit'), '5');
});

test('a lone focus coordinate is rejected rather than quietly ignored', async () => {
	const user = await createUser();

	const res = await request(app)
		.get('/api/geo/search?q=ben thanh&lat=10.82')
		.set(user.auth)
		.expect(400);

	assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('search rejects a query that is too short before calling upstream', async () => {
	const user = await createUser();
	let called = false;

	stubFetch(async () => {
		called = true;
		return json({ features: [] });
	});

	await request(app).get('/api/geo/search?q=a').set(user.auth).expect(400);
	assert.equal(called, false);
});

test('the same OSM object is only listed once', async () => {
	const user = await createUser();

	stubFetch(async () =>
		json({
			features: [
				photonFeature(),
				photonFeature({ name: 'Ben Thanh Market' }),
				photonFeature({ osm_id: 39514796 }),
			],
		})
	);

	const res = await request(app)
		.get('/api/geo/search?q=ben thanh')
		.set(user.auth)
		.expect(200);

	assert.deepEqual(
		res.body.places.map((place) => place.id),
		['W39514795', 'W39514796']
	);
	assert.equal(res.body.places[0].name, 'Chợ Bến Thành');
});

test('a nameless feature falls back to its address', async () => {
	const user = await createUser();

	stubFetch(async () =>
		json({ features: [photonFeature({ name: undefined, housenumber: '12' })] })
	);

	const res = await request(app)
		.get('/api/geo/search?q=quach thi trang')
		.set(user.auth)
		.expect(200);

	assert.equal(
		res.body.places[0].name,
		'12 Công trường Quách Thị Trang, Bến Thành, Thành phố Hồ Chí Minh, Việt Nam'
	);
});

test('reverse geocoding an empty spot is a null place, not an error', async () => {
	const user = await createUser();

	stubFetch(async () => json({ features: [] }));

	const res = await request(app)
		.get('/api/geo/reverse?lat=10.5&lng=107.9')
		.set(user.auth)
		.expect(200);

	assert.equal(res.body.place, null);
});

test('routing returns distance, duration and a GeoJSON line', async () => {
	const user = await createUser();
	let requested = '';

	stubFetch(async (url) => {
		requested = url;
		return json({
			code: 'Ok',
			routes: [
				{
					distance: 7809.5,
					duration: 562.5,
					geometry: {
						type: 'LineString',
						coordinates: [
							[106.7009, 10.7769],
							[106.6595, 10.8184],
						],
					},
				},
			],
		});
	});

	const res = await request(app)
		.get(
			'/api/geo/route?fromLat=10.7769&fromLng=106.7009&toLat=10.8184&toLng=106.6595'
		)
		.set(user.auth)
		.expect(200);

	assert.equal(res.body.route.distanceMeters, 7810);
	assert.equal(res.body.route.durationSeconds, 563);
	assert.equal(res.body.route.geometry.type, 'LineString');
	assert.equal(res.body.route.geometry.coordinates.length, 2);

	assert.ok(
		requested.includes('/route/v1/driving/106.70090,10.77690;106.65950,10.81840')
	);
});

test('unreachable points are a null route rather than a failure', async () => {
	const user = await createUser();

	stubFetch(async () => json({ code: 'NoRoute', routes: [] }));

	const res = await request(app)
		.get('/api/geo/route?fromLat=10.7&fromLng=106.7&toLat=51.5&toLng=-0.12')
		.set(user.auth)
		.expect(200);

	assert.equal(res.body.route, null);
});

test('each profile is routed by its own OSRM deployment', async () => {
	const user = await createUser();
	const requested = {};

	stubFetch(async (url) => {
		requested[url.match(/routed-\w+/)?.[0] ?? 'none'] = url;
		return json({
			code: 'Ok',
			routes: [
				{
					distance: 100,
					duration: 60,
					geometry: { type: 'LineString', coordinates: [] },
				},
			],
		});
	});

	for (const profile of ['driving', 'cycling', 'walking']) {
		await request(app)
			.get(
				`/api/geo/route?fromLat=10.7&fromLng=106.7&toLat=10.8&toLng=106.6&profile=${profile}`
			)
			.set(user.auth)
			.expect(200);
	}

	assert.deepEqual(Object.keys(requested).sort(), [
		'routed-bike',
		'routed-car',
		'routed-foot',
	]);
});

test('an unknown routing profile is rejected', async () => {
	const user = await createUser();

	await request(app)
		.get(
			'/api/geo/route?fromLat=10.7&fromLng=106.7&toLat=10.8&toLng=106.6&profile=../../hack'
		)
		.set(user.auth)
		.expect(400);
});

test('an upstream outage surfaces as 503, not a 500', async () => {
	const user = await createUser();

	stubFetch(async () => ({
		ok: false,
		status: 502,
		json: async () => ({}),
	}));

	const res = await request(app)
		.get('/api/geo/search?q=ben thanh')
		.set(user.auth)
		.expect(503);

	assert.equal(res.body.error.code, 'SERVICE_UNAVAILABLE');
});

test('a failed lookup is not cached', async () => {
	const user = await createUser();
	let calls = 0;

	stubFetch(async () => {
		calls += 1;
		if (calls === 1) throw new Error('socket hang up');
		return json({ features: [photonFeature()] });
	});

	await request(app).get('/api/geo/search?q=ben thanh').set(user.auth).expect(503);

	const res = await request(app)
		.get('/api/geo/search?q=ben thanh')
		.set(user.auth)
		.expect(200);

	assert.equal(calls, 2);
	assert.equal(res.body.places.length, 1);
});
