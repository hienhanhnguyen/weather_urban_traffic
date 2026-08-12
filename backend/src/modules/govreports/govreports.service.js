const {
	AlertEvent,
	ManagedArea,
	ResponseScenario,
	GovReportSchedule,
	User,
} = require('../../shared/models');
const { NotFoundError } = require('../../shared/errors');
const { sendMail } = require('../../shared/mailer');
const govReportTemplate = require('../../shared/templates/gov.report');
const usersService = require('../users/users.service');
const incidentsService = require('../incidents/incidents.service');
const { rangeFor, summarise } = require('../incidents/incidents.report');
const {
	computeNextRun,
	safeZone,
	offsetMs,
} = require('../business/business.schedule');
const {
	TOPICS,
	MAX_EVENTS,
	RECENT_LIMIT,
	dailySeries,
	metricBreakdown,
	responseStats,
	scenarioBreakdown,
} = require('./gov.report');

const publicSchedule = (schedule) => ({
	id: schedule.schedule_id,
	range: schedule.time_range,
	topics: schedule.topics,
	frequency: schedule.frequency,
	weekday: schedule.weekday,
	dayOfMonth: schedule.day_of_month,
	hour: schedule.hour,
	nextRunAt: schedule.next_run_at,
	lastSentAt: schedule.last_sent_at,
});

const iso = (value) =>
	value === undefined || value === null ? null : new Date(value).toISOString();

async function reportZone(userId, at) {
	const { timezone } = await usersService.getPreferences(userId);
	const zone = safeZone(timezone ?? 'UTC');

	return { zone, offsetMinutes: Math.round(offsetMs(at, zone) / 60000) };
}

async function buildReport(userId, query = {}) {
	const generatedAt = new Date();

	const [{ zone, offsetMinutes }, rows, areaRows, scenarioRows] =
		await Promise.all([
			reportZone(userId, generatedAt),
			AlertEvent.findAll({
				where: incidentsService.whereFor(userId, query),
				include: [
					{
						model: ManagedArea,
						as: 'managedArea',
						attributes: ['name'],
						required: false,
					},
					{
						model: ResponseScenario,
						as: 'scenario',
						attributes: ['scenario_id', 'name'],
						required: false,
					},
				],
				order: [['event_id', 'DESC']],
				limit: MAX_EVENTS,
			}),
			ManagedArea.findAll({
				where: { user_id: userId },
				attributes: ['area_id', 'name'],
				raw: true,
			}),
			ResponseScenario.findAll({
				where: { user_id: userId },
				attributes: ['scenario_id', 'name', 'status'],
				raw: true,
			}),
		]);

	const events = rows.map(incidentsService.publicIncident);
	const range = rangeFor(query);

	const { areas, ...summary } = summarise(
		events.map((event) => ({
			areaId: event.areaId,
			severity: event.severity,
			status: event.status,
			count: 1,
			lastAt: event.createdAt,
		})),
		areaRows.map((area) => ({ id: area.area_id, name: area.name }))
	);

	const scenarios = scenarioRows.map((scenario) => ({
		id: scenario.scenario_id,
		name: scenario.name,
		status: scenario.status,
	}));

	return {
		range: {
			timeframe: query.timeframe ?? null,
			from: iso(range.from),
			to: iso(range.to),
			areaId: query.area_id ?? null,
		},
		generatedAt: generatedAt.toISOString(),
		timezone: zone,
		truncated: rows.length === MAX_EVENTS,
		summary: { ...summary, areasManaged: areaRows.length },
		areas,
		daily: dailySeries(events, { ...range, offsetMinutes }),
		metrics: metricBreakdown(events),
		response: responseStats(events),
		scenarios: scenarioBreakdown(events, scenarios),
		recent: events.slice(0, RECENT_LIMIT),
	};
}

async function emailReport(userId, body = {}) {
	const { topics = TOPICS, ...query } = body;

	const user = await User.findByPk(userId, {
		attributes: ['user_id', 'email'],
	});

	const report = await buildReport(userId, query);

	await sendMail({ to: user.email, ...govReportTemplate({ report, topics }) });

	return { sentTo: user.email, generatedAt: report.generatedAt };
}

async function getSchedule(userId) {
	const schedule = await GovReportSchedule.findOne({
		where: { user_id: userId },
	});

	return schedule ? publicSchedule(schedule) : null;
}

async function saveSchedule(userId, body) {
	const { timezone } = await usersService.getPreferences(userId);

	const columns = {
		user_id: userId,
		time_range: body.range,
		topics: body.topics,
		frequency: body.frequency,
		weekday: body.weekday ?? null,
		day_of_month: body.day_of_month ?? null,
		hour: body.hour,
	};

	columns.next_run_at = computeNextRun(columns, timezone ?? 'UTC');

	const existing = await GovReportSchedule.findOne({
		where: { user_id: userId },
	});

	const schedule = existing
		? await existing.update(columns)
		: await GovReportSchedule.create(columns);

	return publicSchedule(schedule);
}

async function removeSchedule(userId) {
	const destroyed = await GovReportSchedule.destroy({
		where: { user_id: userId },
	});

	if (destroyed === 0) throw new NotFoundError('No report schedule');
}

module.exports = {
	publicSchedule,
	buildReport,
	emailReport,
	getSchedule,
	saveSchedule,
	removeSchedule,
};
