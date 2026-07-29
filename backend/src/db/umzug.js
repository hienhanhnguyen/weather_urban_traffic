// Umzug instance
const path = require('path');
const { Umzug, SequelizeStorage } = require('umzug');
const { sequelize } = require('../shared/database');
const logger = require('../shared/logger');

const migrator = new Umzug({
	migrations: {
		glob: ['migrations/*.js', { cwd: __dirname }],
	},
	context: sequelize.getQueryInterface(),
	storage: new SequelizeStorage({
		sequelize,
		tableName: 'schema_migrations'
	}),
	logger,
});

module.exports = { migrator };