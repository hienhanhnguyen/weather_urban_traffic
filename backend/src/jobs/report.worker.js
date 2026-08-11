const { Op } = require('sequelize');
const logger = require('../shared/logger');
const { withAdvisoryLock, LOCK_KEYS } = require('../shared/advisory.lock');
const { sendMail } = require('../shared/mailer');
const reportTemplate = require('../shared/templates/report');
const { ReportSchedule, User } = require('../shared/models');
const businessService = require('../modules/business/business.service');
const usersService = require('../modules/users/users.service');
const { computeNextRun } = require('../modules/business/business.schedule');

// One tick is a batch, not the whole table: a backlog drains over several
// ticks instead of holding the lock — and the mail transport — for minutes.
const BATCH_SIZE = 25;

async function dueSchedules(now) {
	return ReportSchedule.findAll({
		where: { next_run_at: { [Op.lte]: now } },
		order: [['next_run_at', 'ASC']],
		limit: BATCH_SIZE,
	});
}

async function deliver(schedule) {
	const user = await User.findByPk(schedule.user_id, {
		attributes: ['user_id', 'email', 'account_type'],
	});

	// The schedule outlives a downgrade from a business account; it stops
	// producing mail rather than being deleted, so an upgrade resumes it.
	if (!user || user.account_type !== 'business') return false;

	const report = await businessService.buildReport(schedule.user_id, {
		route_id: schedule.route_id,
		range: schedule.time_range,
		units: 'metric',
	});

	await sendMail({ to: user.email, ...reportTemplate({ report }) });
	return true;
}

async function runDue(now = new Date()) {
	const schedules = await dueSchedules(now);
	let sent = 0;
	let failed = 0;

	for (const schedule of schedules) {
		let delivered = false;

		try {
			delivered = await deliver(schedule);
			if (delivered) sent += 1;
		} catch (err) {
			failed += 1;
			logger.error(
				{ err, scheduleId: schedule.schedule_id },
				'scheduled report failed'
			);
		}

		// `next_run_at` moves on either way. A schedule that keeps failing would
		// otherwise be retried on every tick forever, and the user would get the
		// backlog all at once the moment it recovered.
		const { timezone } = await usersService.getPreferences(schedule.user_id);

		await schedule.update({
			next_run_at: computeNextRun(schedule, timezone ?? 'UTC', now),
			...(delivered ? { last_sent_at: now } : {}),
		});
	}

	return { due: schedules.length, sent, failed };
}

async function runReportTick() {
	try {
		const { acquired, result } = await withAdvisoryLock(
			LOCK_KEYS.REPORT_DELIVERY,
			() => runDue()
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

module.exports = { runReportTick, runDue };
