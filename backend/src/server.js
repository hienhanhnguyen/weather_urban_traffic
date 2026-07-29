const app = require('./app');
const config = require('./shared/config');
const logger = require('./shared/logger');

const startHttpServer = () => {
	app.listen(config.port, () => {
		logger.info({ port: config.port, env: config.env }, 'server started');
	});
};

startHttpServer();