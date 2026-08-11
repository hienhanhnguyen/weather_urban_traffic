const { ReportSchedule } = require('../../shared/models');
const { NotFoundError } = require('../../shared/errors');
const routingService = require('../routing/routing.service');
const usersService = require('../users/users.service');
const weatherService = require('../weather/weather.service');
const {
	averageAcrossPoints,
	toDailyBuckets,
	toHourlyBuckets,
	summarize,
	frequency,
} = require('./business.aggregate');
const { computeNextRun } = require('./business.schedule');

const RANGE_HOURS = { '24h': 24, '7d': 168 };
const RANGE_DAYS = { '24h': 2, '7d': 8 };

const round6 = (value) => Math.round(value * 1e6) / 1e6;

const publicSchedule = (schedule) => ({
	id: schedule.schedule_id,
	routeId: schedule.route_id,
	range: schedule.time_range,
	frequency: schedule.frequency,
	weekday: schedule.weekday,
	dayOfMonth: schedule.day_of_month,
	hour: schedule.hour,
	nextRunAt: schedule.next_run_at,
	lastSentAt: schedule.last_sent_at,
});

function samplePoints(route) {
	const ends = [
		{ role: 'start', ...route.start },
		{ role: 'end', ...route.end },
	];

	const seen = new Map();
	for (const point of ends) {
		const key = `${round6(point.latitude)},${round6(point.longitude)}`;
		if (!seen.has(key)) seen.set(key, point);
	}

	return [...seen.values()];
}

async function buildReport(userId, { route_id, range, units }) {
	const route = routingService.publicRoute(
		await routingService.ownedRouteOrFail(userId, route_id)
	);

	const points = samplePoints(route);

	const series = await Promise.all(
		points.map((point) =>
			weatherService.getSeries({
				lat: point.latitude,
				lon: point.longitude,
				units,
				days: RANGE_DAYS[range],
			})
		)
	);

	const hours = averageAcrossPoints(series.map((entry) => entry.hourly)).slice(
		0,
		RANGE_HOURS[range]
	);

	const offsetSeconds = series[0]?.utcOffsetSeconds ?? 0;

	return {
		route,
		range,
		generatedAt: new Date().toISOString(),
		timezone: series[0]?.timezone ?? 'UTC',
		units: series[0]?.units ?? null,
		points: points.map((point) => ({
			role: point.role,
			latitude: point.latitude,
			longitude: point.longitude,
			address: point.address,
		})),
		kpis: summarize(hours),
		series:
			range === '24h'
				? toHourlyBuckets(hours)
				: toDailyBuckets(hours, offsetSeconds),
		frequency: frequency(hours),
	};
}

async function getSchedule(userId) {
	const schedule = await ReportSchedule.findOne({ where: { user_id: userId } });
	return schedule ? publicSchedule(schedule) : null;
}

async function saveSchedule(userId, body) {
	await routingService.ownedRouteOrFail(userId, body.route_id);

	const { timezone } = await usersService.getPreferences(userId);

	const columns = {
		user_id: userId,
		route_id: body.route_id,
		time_range: body.range,
		frequency: body.frequency,
		weekday: body.weekday ?? null,
		day_of_month: body.day_of_month ?? null,
		hour: body.hour,
	};

	columns.next_run_at = computeNextRun(columns, timezone ?? 'UTC');

	const existing = await ReportSchedule.findOne({ where: { user_id: userId } });

	const schedule = existing
		? await existing.update(columns)
		: await ReportSchedule.create(columns);

	return publicSchedule(schedule);
}

async function removeSchedule(userId) {
	const destroyed = await ReportSchedule.destroy({ where: { user_id: userId } });
	if (destroyed === 0) throw new NotFoundError('No report schedule');
}

module.exports = {
	publicSchedule,
	samplePoints,
	buildReport,
	getSchedule,
	saveSchedule,
	removeSchedule,
};
