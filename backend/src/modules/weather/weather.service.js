const config = require('../../shared/config');
const { request } = require('./weather.client');
const { TtlCache } = require('./weather.cache');

const cache = new TtlCache(500);

const gridKey = (value) => Number(value).toFixed(2);

const cacheKey = (kind, params) =>
	[kind, ...Object.entries(params).map(([k, v]) => `${k}=${v}`)].join('|');

async function cached(key, ttlMs, produce) {
	const hit = cache.get(key);
	if (hit !== undefined) return hit;

	const value = await produce();
	cache.set(key, value, ttlMs);
	return value;
}

async function getCurrent({ lat, lon, units, lang }) {
	const query = {
		lat: gridKey(lat),
		lon: gridKey(lon),
		units,
		lang,
	};

	return cached(
		cacheKey('current', query),
		config.weather.currentTtlMs,
		() => request('/data/2.5/weather', query)
	);
}

async function getForecast({ lat, lon, units, lang }) {
	const query = {
		lat: gridKey(lat),
		lon: gridKey(lon),
		units,
		lang,
	};

	return cached(
		cacheKey('forecast', query),
		config.weather.forecastTtlMs,
		() => request('/data/2.5/forecast', query)
	);
}

async function geocode({ q, limit }) {
	const query = { q, limit };

	return cached(
		cacheKey('geo', query),
		config.weather.forecastTtlMs,
		() => request('/geo/1.0/direct', query)
	);
}

module.exports = { getCurrent, getForecast, geocode, cache };