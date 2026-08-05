const { Op } = require('sequelize');
const config = require('../shared/config');
const logger = require('../shared/logger');
const { withAdvisoryLock, LOCK_KEYS } = require('../shared/advisory.lock');
const {
	RefreshToken,
	OtpCode,
	PasswordResetToken,
} = require('../shared/models');

async function purge() {
	const cutoff = new Date(
		Date.now() - config.jobs.cleanupGraceDays * 24 * 60 * 60 * 1000
	);

	const [refreshTokens, otpCodes, resetTokens] = await Promise.all([
		RefreshToken.destroy({ where: { expires_at: { [Op.lt]: cutoff } } }),
		OtpCode.destroy({ where: { expires_at: { [Op.lt]: cutoff } } }),
		PasswordResetToken.destroy({ where: { expires_at: { [Op.lt]: cutoff } } }),
	]);

	return { refreshTokens, otpCodes, resetTokens };
}

async function runCleanupTick() {
	try {
		const { acquired, result } = await withAdvisoryLock(
			LOCK_KEYS.CLEANUP,
			purge
		);

		if (!acquired) return;

		const total = Object.values(result).reduce((sum, n) => sum + n, 0);
		if (total > 0) logger.info(result, 'expired auth tokens purged');
	} catch (err) {
		logger.error({ err }, 'cleanup tick failed');
	}
}

module.exports = { runCleanupTick, purge };