const { BadRequestError } = require('../../shared/errors');
const weatherService = require('../weather/weather.service');
const { assessHour, adviceFor } = require('./analysis.rules');

const HORIZON_DAYS = 3;
const OUTLOOK_HOURS = 12;
const SUGGEST_WINDOW_HOURS = 12;

const NEAREST_TOLERANCE_MS = 60 * 60 * 1000;

const round6 = (value) => Math.round(value * 1e6) / 1e6;

function tripPoints({ lat, lon, to_lat, to_lon }) {
	const ends = [{ role: 'start', latitude: lat, longitude: lon }];

	if (to_lat !== undefined) {
		ends.push({ role: 'end', latitude: to_lat, longitude: to_lon });
	}

	const seen = new Map();
	for (const point of ends) {
		const key = `${round6(point.latitude)},${round6(point.longitude)}`;
		if (!seen.has(key)) seen.set(key, point);
	}

	return [...seen.values()];
}

function nearestIndex(rows, instant) {
	const target = instant.getTime();

	let best = -1;
	let bestDiff = Infinity;

	for (let index = 0; index < rows.length; index += 1) {
		const diff = Math.abs(Date.parse(rows[index].time) - target);
		if (diff < bestDiff) {
			bestDiff = diff;
			best = index;
		}
	}

	if (best === -1 || bestDiff > NEAREST_TOLERANCE_MS) {
		throw new BadRequestError('No forecast covers that departure time', {
			code: 'OUTSIDE_FORECAST_WINDOW',
		});
	}

	return best;
}

function worstAcrossPoints(assessments) {
	return assessments.reduce((worst, entry) =>
		entry.score > worst.score ? entry : worst
	);
}

function combinedTimeline(series) {
	const byTime = new Map();

	for (const rows of series) {
		for (const row of rows) {
			const scored = assessHour(row);
			const current = byTime.get(row.time);
			if (!current || scored.score > current.score) {
				byTime.set(row.time, { time: row.time, ...scored });
			}
		}
	}

	return [...byTime.values()].sort((a, b) => (a.time < b.time ? -1 : 1));
}

const ACCEPTABLE = new Set(['low', 'moderate']);
const WORTH_WAITING_FOR = 10;

function betterHour(timeline, targetIndex) {
	const target = timeline[targetIndex];
	if (target.band === 'low') return null;

	const window = timeline.slice(
		targetIndex + 1,
		targetIndex + 1 + SUGGEST_WINDOW_HOURS
	);

	const found = window.find(
		(hour) =>
			ACCEPTABLE.has(hour.band) &&
			target.score - hour.score >= WORTH_WAITING_FOR
	);

	return found
		? { at: found.time, score: found.score, band: found.band }
		: null;
}

async function assessTrip(query) {
	const points = tripPoints(query);

	const series = await Promise.all(
		points.map((point) =>
			weatherService.getSeries({
				lat: point.latitude,
				lon: point.longitude,
				units: 'metric',
				days: HORIZON_DAYS,
			})
		)
	);

	const timeline = combinedTimeline(series.map((entry) => entry.hourly));
	const targetIndex = nearestIndex(timeline, query.depart_at);
	const assessedAt = timeline[targetIndex].time;

	const perPoint = points.map((point, index) => {
		const row =
			series[index].hourly.find((entry) => entry.time === assessedAt) ?? {
				time: assessedAt,
			};
		const scored = assessHour(row);

		return {
			role: point.role,
			latitude: point.latitude,
			longitude: point.longitude,
			conditions: row,
			...scored,
		};
	});

	const worst = worstAcrossPoints(perPoint);

	return {
		departAt: query.depart_at.toISOString(),
		assessedAt,
		timezone: series[0].timezone,
		units: series[0].units,
		score: worst.score,
		band: worst.band,
		rules: worst.rules,
		advice: adviceFor(worst.band, worst.rules),
		worstPoint: worst.role,
		points: perPoint,
		suggestion: betterHour(timeline, targetIndex),
		outlook: timeline
			.slice(targetIndex, targetIndex + OUTLOOK_HOURS)
			.map((hour) => ({ at: hour.time, score: hour.score, band: hour.band })),
	};
}

module.exports = {
	assessTrip,
	tripPoints,
	combinedTimeline,
	betterHour,
};
