const { Op } = require('sequelize');
const logger = require('../shared/logger');
const { withAdvisoryLock, LOCK_KEYS } = require('../shared/advisory.lock');
const { sendMail } = require('../shared/mailer');
const reportTemplate = require('../shared/templates/report');
const govReportTemplate = require('../shared/templates/gov.report');
const {
	GovReportSchedule,
	ReportSchedule,
	Role,
	User,
} = require('../shared/models');
const businessService = require('../modules/business/business.service');
const govReportsService = require('../modules/govreports/govreports.service');
const usersService = require('../modules/users/users.service');
const { computeNextRun } = require('../modules/business/business.schedule');

const BATCH_SIZE = 25;

async function dueSchedules(model, now) {
	return model.findAll({
		where: { next_run_at: { [Op.lte]: now } },
		order: [['next_run_at', 'ASC']],
		limit: BATCH_SIZE,
	});
}

async function deliver(schedule) {
	const user = await User.findByPk(schedule.user_id, {
		attributes: ['user_id', 'email', 'account_type'],
	});

	if (!user || user.account_type !== 'business') return false;

	const report = await businessService.buildReport(schedule.user_id, {
		route_id: schedule.route_id,
		range: schedule.time_range,
		units: 'metric',
	});

	await sendMail({ to: user.email, ...reportTemplate({ report }) });
	return true;
}

async function deliverGov(schedule) {
	const user = await User.findByPk(schedule.user_id, {
		attributes: ['user_id', 'email'],
		include: [{ model: Role, as: 'roles', through: { attributes: [] } }],
	});

	const granted = (user?.roles ?? []).some((role) => role.name === 'admin');

	if (!granted) return false;

	const report = await govReportsService.buildReport(schedule.user_id, {
		timeframe: schedule.time_range,
	});

	await sendMail({
		to: user.email,
		...govReportTemplate({ report, topics: schedule.topics }),
	});

	return true;
}

async function drain(schedules, send, now) {
	let sent = 0;
	let failed = 0;

	for (const schedule of schedules) {
		let delivered = false;

		try {
			delivered = await send(schedule);
			if (delivered) sent += 1;
		} catch (err) {
			failed += 1;
			logger.error(
				{ err, scheduleId: schedule.schedule_id },
				'scheduled report failed'
			);
		}

		const { timezone } = await usersService.getPreferences(schedule.user_id);

		await schedule.update({
			next_run_at: computeNextRun(schedule, timezone ?? 'UTC', now),
			...(delivered ? { last_sent_at: now } : {}),
		});
	}

	return { due: schedules.length, sent, failed };
}

async function runDue(now = new Date()) {
	return drain(await dueSchedules(ReportSchedule, now), deliver, now);
}

async function runGovDue(now = new Date()) {
	return drain(await dueSchedules(GovReportSchedule, now), deliverGov, now);
}

const total = (...results) =>
	results.reduce(
		(sum, result) => ({
			due: sum.due + result.due,
			sent: sum.sent + result.sent,
			failed: sum.failed + result.failed,
		}),
		{ due: 0, sent: 0, failed: 0 }
	);

async function runReportTick() {
	try {
		const { acquired, result } = await withAdvisoryLock(
			LOCK_KEYS.REPORT_DELIVERY,
			async () => total(await runDue(), await runGovDue())
		);

		if (!acquired) {
			logger.debug('report tick skipped — another instance holds the lock');
			return;
		}

		if (result.due > 0) logger.info(result, 'report tick complete');
	} catch (err) {
		logger.error({ err }, 'report tick failed');
	}
}

module.exports = { runReportTick, runDue, runGovDue };
