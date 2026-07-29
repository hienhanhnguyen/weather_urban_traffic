const { migrator } = require('../src/db/umzug');
const { sequelize } = require('../src/shared/database');
const logger = require('../src/shared/logger');

const commands = {
	up: () => migrator.up(),
	down: () => migrator.down(),
	pending: () => migrator.pending(),
	executed: () => migrator.executed(),
};

const run = async () => {
	const command = process.argv[2];
	const action = commands[command];

	if (!action) {
		logger.error({ command, available: Object.keys(commands) }, 'unknown migrate command');
		process.exitCode = 1;
		return;
	}

	const result = await action();

	logger.info({ command, migrations: result.map((m) => m.name) }, 'migration command finished');
};

run()
	.catch((err) => {
		logger.error({ err }, 'migration failed');
		process.exitCode = 1;
	})
	.finally(() => sequelize.close());