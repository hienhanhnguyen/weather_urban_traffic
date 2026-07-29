// Sequelize instance. One per process.
const { Sequelize } = require('sequelize');
const config = require('./config');
const logger = require('./logger');

const baseOptions = {
	dialect: 'postgres',
	logging: (sql) => logger.debug({ sql }, 'sequelize'),
	pool: {
		max: 5, min: 0, acquire: 30000, idle: 10000
	},
	define: {
		underscored: true,
		freezeTableName: true,
		timestamps: true,
	},
	...(config.db.ssl
		? {
			dialectOptions: {
				ssl: {
					require: true,
					rejectUnauthorized: false
				}
			}
		}
		: {}),
};

const sequelize = config.db.url
	? new Sequelize(config.db.url, baseOptions)
	: new Sequelize(config.db.name, config.db.user, config.db.pass, {
		...baseOptions,
		host: config.db.host,
		port: config.db.port,
	});

// Throw if the database is unreachable
async function assertConnection() {
	await sequelize.authenticate();
}

module.exports = { sequelize, assertConnection };