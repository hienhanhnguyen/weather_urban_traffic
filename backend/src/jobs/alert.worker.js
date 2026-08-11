const logger = require('../shared/logger');
const { withAdvisoryLock, LOCK_KEYS } = require('../shared/advisory.lock');
const evaluator = require('../modules/alerts/alert.evaluator');
const areaEvaluator = require('../modules/areas/area.evaluator');

async function runAlertTick() {
	const startedAt = Date.now();

	try {
		const { acquired, result } = await withAdvisoryLock(
			LOCK_KEYS.ALERT_EVALUATION,
			async () => ({
				locations: await evaluator.evaluateAll(),
				areas: await areaEvaluator.evaluateAll(),
			})
		);

		if (!acquired) {
			logger.debug('alert tick skipped — another instance holds the lock');
			return;
		}

		logger.info(
			{ ...result, durationMs: Date.now() - startedAt },
			'alert tick complete'
		);
	} catch (err) {
		logger.error({ err }, 'alert tick failed');
	}
}

module.exports = { runAlertTick };
