const app = require('./app');
const config = require('./shared/config');
const logger = require('./shared/logger');
const { assertConnection } = require('./shared/database');

const startHttpServer = () => {
	app.listen(config.port, () => {
		logger.info({ port: config.port, env: config.env }, 'server started');
	});
};

const start = async () => {
	try {
		await assertConnection();
		logger.info(
			{ host: config.db.host, data }, 'database connected'
		);
	} catch (err) {
		logger.fatal({ err }, 'database refuse to start');
		process.exit(1);
	}

	startHttpServer();
};

start();