const GROUPS = [
	{ key: 'clear', codes: [0, 1] },
	{ key: 'cloudy', codes: [2, 3] },
	{ key: 'fog', codes: [45, 48] },
	{ key: 'drizzle', codes: [51, 53, 55, 56, 57] },
	{ key: 'rain', codes: [61, 63, 65, 66, 67, 80, 81, 82] },
	{ key: 'snow', codes: [71, 73, 75, 77, 85, 86] },
	{ key: 'thunder', codes: [95, 96, 99] },
];

const GROUP_KEYS = GROUPS.map((group) => group.key);

const SEVERITY = ['clear', 'cloudy', 'fog', 'drizzle', 'rain', 'snow', 'thunder'];

const DISRUPTIVE = new Set(['rain', 'snow', 'thunder']);

const CODE_TO_GROUP = new Map(
	GROUPS.flatMap((group) => group.codes.map((code) => [code, group.key]))
);

function groupForCode(code) {
	if (code === null || code === undefined) return null;
	return CODE_TO_GROUP.get(code) ?? 'cloudy';
}

const rank = (group) => {
	const index = SEVERITY.indexOf(group);
	return index === -1 ? -1 : index;
};

const round1 = (value) => (value === null ? null : Math.round(value * 10) / 10);

function mean(values) {
	const numbers = values.filter((value) => value !== null && value !== undefined);
	if (numbers.length === 0) return null;
	return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function extreme(values, pick) {
	const numbers = values.filter((value) => value !== null && value !== undefined);
	return numbers.length === 0 ? null : numbers.reduce(pick);
}

const lowest = (values) => extreme(values, (a, b) => (b < a ? b : a));
const highest = (values) => extreme(values, (a, b) => (b > a ? b : a));

function averageAcrossPoints(seriesList) {
	const byTime = new Map();

	for (const rows of seriesList) {
		for (const row of rows) {
			const bucket = byTime.get(row.time) ?? [];
			bucket.push(row);
			byTime.set(row.time, bucket);
		}
	}

	return [...byTime.entries()]
		.sort(([a], [b]) => (a < b ? -1 : 1))
		.map(([time, rows]) => ({
			time,
			temp: round1(mean(rows.map((row) => row.temp))),
			precip: round1(mean(rows.map((row) => row.precip))),
			precipProb: round1(highest(rows.map((row) => row.precipProb))),
			humidity: round1(mean(rows.map((row) => row.humidity))),
			wind: round1(mean(rows.map((row) => row.wind))),
			weatherCode: rows
				.map((row) => row.weatherCode)
				.filter((code) => code !== null && code !== undefined)
				.reduce(
					(worst, code) =>
						worst === null || rank(groupForCode(code)) > rank(groupForCode(worst))
							? code
							: worst,
					null
				),
		}));
}

const localDate = (iso, offsetSeconds) =>
	new Date(Date.parse(iso) + offsetSeconds * 1000).toISOString().slice(0, 10);

function toDailyBuckets(rows, offsetSeconds) {
	const byDate = new Map();

	for (const row of rows) {
		const date = localDate(row.time, offsetSeconds);
		const bucket = byDate.get(date) ?? [];
		bucket.push(row);
		byDate.set(date, bucket);
	}

	return [...byDate.entries()].map(([date, bucket]) => ({
		at: date,
		temp: round1(mean(bucket.map((row) => row.temp))),
		tempMin: round1(lowest(bucket.map((row) => row.temp))),
		tempMax: round1(highest(bucket.map((row) => row.temp))),
		precip: round1(
			bucket.reduce((sum, row) => sum + (row.precip ?? 0), 0)
		),
		precipProb: round1(highest(bucket.map((row) => row.precipProb))),
		humidity: round1(mean(bucket.map((row) => row.humidity))),
		wind: round1(mean(bucket.map((row) => row.wind))),
	}));
}

const toHourlyBuckets = (rows) =>
	rows.map((row) => ({
		at: row.time,
		temp: row.temp,
		tempMin: null,
		tempMax: null,
		precip: row.precip,
		precipProb: row.precipProb,
		humidity: row.humidity,
		wind: row.wind,
	}));

function summarize(rows) {
	const temps = rows.map((row) => row.temp);

	return {
		hours: rows.length,
		avgTemp: round1(mean(temps)),
		minTemp: round1(lowest(temps)),
		maxTemp: round1(highest(temps)),
		totalPrecip: round1(rows.reduce((sum, row) => sum + (row.precip ?? 0), 0)),
		maxPrecipProb: round1(highest(rows.map((row) => row.precipProb))),
		avgHumidity: round1(mean(rows.map((row) => row.humidity))),
		avgWind: round1(mean(rows.map((row) => row.wind))),
		maxWind: round1(highest(rows.map((row) => row.wind))),
		wetHours: rows.filter((row) => (row.precip ?? 0) > 0).length,
		disruptiveHours: rows.filter((row) =>
			DISRUPTIVE.has(groupForCode(row.weatherCode))
		).length,
	};
}

function frequency(rows) {
	const counts = new Map(GROUP_KEYS.map((key) => [key, 0]));

	for (const row of rows) {
		const group = groupForCode(row.weatherCode);
		if (group !== null) counts.set(group, counts.get(group) + 1);
	}

	return GROUP_KEYS.map((group) => ({ group, hours: counts.get(group) }));
}

module.exports = {
	GROUP_KEYS,
	groupForCode,
	averageAcrossPoints,
	toDailyBuckets,
	toHourlyBuckets,
	summarize,
	frequency,
};
