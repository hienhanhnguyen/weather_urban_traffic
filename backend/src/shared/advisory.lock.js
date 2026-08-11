const { sequelize } = require('./database');
const logger = require('./logger');

const NAMESPACE = 0x7754;

async function withAdvisoryLock(key, fn) {
	const manager = sequelize.connectionManager;
	const connection = await manager.getConnection();

	let held = false;

	try {
		const acquire = await connection.query(
			'SELECT pg_try_advisory_lock($1, $2) AS locked',
			[NAMESPACE, key]
		);

		held = acquire.rows[0].locked === true;
		if (!held) return { acquired: false, result: undefined };

		return { acquired: true, result: await fn() };
	} finally {
		if (held) {
			try {
				await connection.query('SELECT pg_advisory_unlock($1, $2)', [
					NAMESPACE,
					key,
				]);
			} catch (err) {
				logger.error({ err, key }, 'failed to release advisory lock');
			}
		}
		await manager.releaseConnection(connection);
	}
}

const LOCK_KEYS = Object.freeze({
	ALERT_EVALUATION: 1,
	CLEANUP: 2,
	REPORT_DELIVERY: 3,
});

module.exports = { withAdvisoryLock, LOCK_KEYS };