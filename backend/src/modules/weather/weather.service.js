const config = require('../../shared/config');
const { request } = require('./weather.client');
const { TtlCache } = require('../../shared/ttl.cache');
const {
	UNIT_PARAMS,
	publicCurrent,
	publicForecast,
	publicSeries,
} = require('./weather.mapper');

const cache = new TtlCache(500);

const PATH = '/v1/forecast';

const CURRENT_VARIABLES = [
	'temperature_2m',
	'apparent_temperature',
	'relative_humidity_2m',
	'precipitation',
	'weather_code',
	'wind_speed_10m',
	'wind_direction_10m',
	'pressure_msl',
	'is_day',
].join(',');

const HOURLY_VARIABLES = [
	'temperature_2m',
	'apparent_temperature',
	'precipitation',
	'precipitation_probability',
	'weather_code',
].join(',');

const DAILY_VARIABLES = [
	'weather_code',
	'temperature_2m_max',
	'temperature_2m_min',
	'precipitation_sum',
	'precipitation_probability_max',
	'sunrise',
	'sunset',
].join(',');

const SERIES_VARIABLES = [
	'temperature_2m',
	'precipitation',
	'precipitation_probability',
	'relative_humidity_2m',
	'wind_speed_10m',
	'weather_code',
].join(',');

const FORECAST_DAYS = 7;

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

const baseQuery = (lat, lon, units) => ({
	latitude: gridKey(lat),
	longitude: gridKey(lon),
	timezone: 'auto',
	timeformat: 'unixtime',
	...UNIT_PARAMS[units],
});

async function getCurrent({ lat, lon, units }) {
	const query = {
		...baseQuery(lat, lon, units),
		current: CURRENT_VARIABLES,
		hourly: 'precipitation_probability',
		forecast_days: 1,
	};

	const payload = await cached(
		cacheKey('current', query),
		config.weather.currentTtlMs,
		() => request(PATH, query)
	);

	return publicCurrent(payload, units);
}

async function getForecast({ lat, lon, units }) {
	const query = {
		...baseQuery(lat, lon, units),
		hourly: HOURLY_VARIABLES,
		daily: DAILY_VARIABLES,
		forecast_days: FORECAST_DAYS,
	};

	const payload = await cached(
		cacheKey('forecast', query),
		config.weather.forecastTtlMs,
		() => request(PATH, query)
	);

	return publicForecast(payload, units);
}

async function getSeries({ lat, lon, units, days }) {
	const query = {
		...baseQuery(lat, lon, units),
		hourly: SERIES_VARIABLES,
		forecast_days: days,
	};

	const payload = await cached(
		cacheKey('series', query),
		config.weather.forecastTtlMs,
		() => request(PATH, query)
	);

	return publicSeries(payload, units);
}

module.exports = { getCurrent, getForecast, getSeries, cache };
