const http = require('node:http');
const app = require('./app');
const config = require('./shared/config');
const logger = require('./shared/logger');
const { sequelize, assertConnection } = require('./shared/database');
const { closeMailer } = require('./shared/mailer');
const { attachRealtime } = require('./realtime/attach');
const { initPush } = require('./realtime/push');
const { startJobs, stopJobs } = require('./jobs/scheduler');

const server = http.createServer(app);
let realtime = null;
let shuttingDown = false;

async function start() {
	try {
		await assertConnection();
		logger.info(
			{ host: config.db.host, database: config.db.name },
			'database connected'
		);
	} catch (err) {
		logger.fatal({ err }, 'database refused the connection — not starting');
		process.exitCode = 1;
		return;
	}

	realtime = attachRealtime(server);
	initPush();
	startJobs();

	server.listen(config.port, () => {
		logger.info({ port: config.port, env: config.env }, 'server started');
	});
}

async function shutdown(signal) {
	if (shuttingDown) return;
	shuttingDown = true;

	logger.info({ signal }, 'shutting down');

	const hardExit = setTimeout(() => {
		logger.fatal('shutdown timed out — forcing exit');
		process.exit(1);
	}, config.shutdownTimeoutMs);

	hardExit.unref();

	try {
		await stopJobs();
		logger.info('background jobs stopped');

		await new Promise((resolve) => server.close(resolve));
		logger.info('http server closed');

		if (realtime) await realtime.close();
		logger.info('websocket server closed');

		await closeMailer();
		await sequelize.close();
		logger.info('database pool closed');

		process.exitCode = 0;
	} catch (err) {
		logger.error({ err }, 'error during shutdown');
		process.exitCode = 1;
	} finally {
		clearTimeout(hardExit);
	}
}

for (const signal of ['SIGTERM', 'SIGINT']) {
	process.on(signal, () => shutdown(signal));
}

process.on('unhandledRejection', (reason) => {
	logger.fatal({ err: reason }, 'unhandled rejection');
	shutdown('unhandledRejection');
});

process.on('uncaughtException', (err) => {
	logger.fatal({ err }, 'uncaught exception');
	shutdown('uncaughtException');
});

start();

module.exports = { server, shutdown };