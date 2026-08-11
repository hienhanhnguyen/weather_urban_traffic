const UNIT_PARAMS = Object.freeze({
	metric: {
		temperature_unit: 'celsius',
		wind_speed_unit: 'kmh',
		precipitation_unit: 'mm',
	},
	imperial: {
		temperature_unit: 'fahrenheit',
		wind_speed_unit: 'mph',
		precipitation_unit: 'inch',
	},
});

const UNIT_LABELS = Object.freeze({
	metric: { temp: '°C', wind: 'km/h', precip: 'mm' },
	imperial: { temp: '°F', wind: 'mph', precip: 'in' },
});

const toIso = (seconds) =>
	typeof seconds === 'number' ? new Date(seconds * 1000).toISOString() : null;

/** A calendar day only exists in a timezone, so it is resolved with the offset. */
const toLocalDate = (seconds, offsetSeconds) =>
	typeof seconds === 'number'
		? new Date((seconds + offsetSeconds) * 1000).toISOString().slice(0, 10)
		: null;

const numberOrNull = (value) =>
	typeof value === 'number' && Number.isFinite(value) ? value : null;

function zipHourly(hourly, { from = 0, count } = {}) {
	const times = hourly?.time ?? [];
	const rows = [];

	for (let index = 0; index < times.length; index += 1) {
		if (times[index] < from) continue;
		if (count !== undefined && rows.length >= count) break;

		rows.push({
			time: toIso(times[index]),
			temp: numberOrNull(hourly.temperature_2m?.[index]),
			feelsLike: numberOrNull(hourly.apparent_temperature?.[index]),
			precip: numberOrNull(hourly.precipitation?.[index]),
			precipProb: numberOrNull(hourly.precipitation_probability?.[index]),
			weatherCode: numberOrNull(hourly.weather_code?.[index]),
		});
	}

	return rows;
}

/**
 * The report series carries humidity and wind, which the forecast screen does
 * not ask for. Keeping it separate from `zipHourly` avoids two fields that
 * would always be null in the forecast response.
 */
function zipSeries(hourly, { from = 0 } = {}) {
	const times = hourly?.time ?? [];
	const rows = [];

	for (let index = 0; index < times.length; index += 1) {
		if (times[index] < from) continue;

		rows.push({
			time: toIso(times[index]),
			temp: numberOrNull(hourly.temperature_2m?.[index]),
			precip: numberOrNull(hourly.precipitation?.[index]),
			precipProb: numberOrNull(hourly.precipitation_probability?.[index]),
			humidity: numberOrNull(hourly.relative_humidity_2m?.[index]),
			wind: numberOrNull(hourly.wind_speed_10m?.[index]),
			weatherCode: numberOrNull(hourly.weather_code?.[index]),
		});
	}

	return rows;
}

function zipDaily(daily, offsetSeconds) {
	const times = daily?.time ?? [];

	return times.map((seconds, index) => ({
		date: toLocalDate(seconds, offsetSeconds),
		weatherCode: numberOrNull(daily.weather_code?.[index]),
		tempMin: numberOrNull(daily.temperature_2m_min?.[index]),
		tempMax: numberOrNull(daily.temperature_2m_max?.[index]),
		precipSum: numberOrNull(daily.precipitation_sum?.[index]),
		precipProbMax: numberOrNull(daily.precipitation_probability_max?.[index]),
		sunrise: toIso(daily.sunrise?.[index]),
		sunset: toIso(daily.sunset?.[index]),
	}));
}

const place = (payload, units) => ({
	coordinates: {
		latitude: numberOrNull(payload?.latitude),
		longitude: numberOrNull(payload?.longitude),
	},
	timezone: payload?.timezone ?? 'UTC',
	utcOffsetSeconds: payload?.utc_offset_seconds ?? 0,
	units: UNIT_LABELS[units],
});

function probabilityNow(payload) {
	const times = payload?.hourly?.time ?? [];
	const values = payload?.hourly?.precipitation_probability ?? [];
	const now = payload?.current?.time;

	if (typeof now !== 'number' || times.length === 0) return null;

	let match = -1;
	for (let index = 0; index < times.length; index += 1) {
		if (times[index] <= now) match = index;
		else break;
	}

	return match === -1 ? null : numberOrNull(values[match]);
}

function publicCurrent(payload, units) {
	const current = payload?.current ?? {};

	return {
		...place(payload, units),
		observedAt: toIso(current.time),
		isDay: current.is_day === 1,
		weatherCode: numberOrNull(current.weather_code),
		temp: numberOrNull(current.temperature_2m),
		feelsLike: numberOrNull(current.apparent_temperature),
		humidity: numberOrNull(current.relative_humidity_2m),
		precip: numberOrNull(current.precipitation),
		precipProb: probabilityNow(payload),
		windSpeed: numberOrNull(current.wind_speed_10m),
		windDirection: numberOrNull(current.wind_direction_10m),
		pressure: numberOrNull(current.pressure_msl),
	};
}

function publicSeries(payload, units, nowSeconds = Date.now() / 1000) {
	return {
		...place(payload, units),
		hourly: zipSeries(payload?.hourly, { from: Math.floor(nowSeconds) }),
	};
}

function publicForecast(payload, units, nowSeconds = Date.now() / 1000) {
	const offsetSeconds = payload?.utc_offset_seconds ?? 0;

	const from = Math.floor(nowSeconds) - 3600;

	return {
		...place(payload, units),
		hourly: zipHourly(payload?.hourly, { from }),
		daily: zipDaily(payload?.daily, offsetSeconds),
	};
}

module.exports = {
	UNIT_PARAMS,
	UNIT_LABELS,
	publicCurrent,
	publicForecast,
	publicSeries,
	zipHourly,
	zipSeries,
};
