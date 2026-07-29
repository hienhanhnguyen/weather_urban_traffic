// The only module allow to touch process.env.

const path = require('path'); // node built-in
const Joi = require('joi');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const schema = Joi.object({
	NODE_ENV: Joi.string()
		.valid('development', 'test', 'production')
		.default('development'),

	PORT: Joi.number()
		.port()
		.default(3000),

	LOG_LEVEL: Joi.string()
		.valid('trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent')
		.default('info'),
});

// checks process.env against the schema 
// returns object with two properties: value and error.
const { value: env, error } =
	schema.validate(process.env, {
		abortEarly: false,
		stripUnknown: true,
	});

if (error) {
	console.error('Invalid environment configuration: ');
	for (const detail of error.details) {
		console.error(`  - ${detail.message}`);
	}
	process.exit(1);
}

const config = Object.freeze({
	env: env.NODE_ENV,
	isProduction: env.NODE_ENV === 'production',
	port: env.PORT,
	log: Object.freeze({ level: env.LOG_LEVEL }),
});

module.exports = config;