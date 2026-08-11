const config = require('../shared/config');
const logger = require('../shared/logger');
const { runAlertTick } = require('./alert.worker');
const { runCleanupTick } = require('./cleanup.worker');
const { runReportTick } = require('./report.worker');

const jobs = [];

function schedule({ name, intervalMs, run, delayMs = 5000 }) {
	let inFlight = null;

	const invoke = () => {
		if (inFlight) {
			logger.warn({ job: name }, 'tick skipped — previous tick still running');
			return;
		}

		inFlight = run().finally(() => {
			inFlight = null;
		});
	};

	const interval = setInterval(invoke, intervalMs);
	interval.unref();

	const kickoff = setTimeout(invoke, delayMs);
	kickoff.unref();

	const job = {
		name,
		stop() {
			clearInterval(interval);
			clearTimeout(kickoff);
		},
		drain: () => inFlight ?? Promise.resolve(),
	};

	jobs.push(job);
	return job;
}

function startJobs() {
	if (config.isTest) return;

	if (config.jobs.alertWorkerEnabled) {
		schedule({
			name: 'alerts',
			intervalMs: config.jobs.alertIntervalMinutes * 60_000,
			run: runAlertTick,
		});
		logger.info(
			{ intervalMinutes: config.jobs.alertIntervalMinutes },
			'alert worker scheduled'
		);
	}

	if (config.jobs.reportWorkerEnabled) {
		schedule({
			name: 'reports',
			intervalMs: config.jobs.reportIntervalMinutes * 60_000,
			run: runReportTick,
			delayMs: 15_000,
		});
		logger.info(
			{ intervalMinutes: config.jobs.reportIntervalMinutes },
			'report worker scheduled'
		);
	}

	schedule({
		name: 'cleanup',
		intervalMs: config.jobs.cleanupIntervalMinutes * 60_000,
		run: runCleanupTick,
		delayMs: 30_000,
	});
}

async function stopJobs() {
	for (const job of jobs) job.stop();
	await Promise.allSettled(jobs.map((job) => job.drain()));
	jobs.length = 0;
}

module.exports = { startJobs, stopJobs };