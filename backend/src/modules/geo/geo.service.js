const config = require('../../shared/config');
const { TtlCache } = require('../../shared/ttl.cache');
const { request } = require('./geo.client');
const { toPlaces, toRoute } = require('./geo.mapper');

const cache = new TtlCache(1000);

async function cached(key, ttlMs, produce) {
	const hit = cache.get(key);
	if (hit !== undefined) return hit;

	const value = await produce();
	cache.set(key, value, ttlMs);
	return value;
}

const round = (value, decimals) => Number(value).toFixed(decimals);

async function search({ q, lat, lng, limit }) {
	const params = new URLSearchParams({ q, limit: String(limit) });

	if (lat !== undefined && lng !== undefined) {
		params.set('lat', round(lat, 2));
		params.set('lon', round(lng, 2));
	}

	const url = `${config.geo.geocoderUrl}/api/?${params}`;

	return cached(`search|${params}`, config.geo.searchTtlMs, async () => ({
		places: toPlaces(await request(url, 'photon')),
	}));
}

async function reverse({ lat, lng }) {
	const params = new URLSearchParams({
		lat: round(lat, 5),
		lon: round(lng, 5),
	});

	const url = `${config.geo.geocoderUrl}/reverse?${params}`;

	return cached(`reverse|${params}`, config.geo.reverseTtlMs, async () => {
		const places = toPlaces(await request(url, 'photon'));
		return { place: places[0] ?? null };
	});
}

const PROFILE_MOUNT = Object.freeze({
	driving: 'routed-car',
	cycling: 'routed-bike',
	walking: 'routed-foot',
});

async function route({ fromLat, fromLng, toLat, toLng, profile }) {
	const coordinates =
		`${round(fromLng, 5)},${round(fromLat, 5)};` +
		`${round(toLng, 5)},${round(toLat, 5)}`;

	const params = new URLSearchParams({
		overview: 'simplified',
		geometries: 'geojson',
		alternatives: 'false',
		steps: 'false',
	});

	const url =
		`${config.geo.routerUrl}/${PROFILE_MOUNT[profile]}` +
		`/route/v1/driving/${coordinates}?${params}`;

	return cached(
		`route|${profile}|${coordinates}`,
		config.geo.routeTtlMs,
		async () => {
			const payload = await request(url, 'osrm');
			return { route: payload?.code === 'Ok' ? toRoute(payload) : null };
		}
	);
}

module.exports = { search, reverse, route, cache };
