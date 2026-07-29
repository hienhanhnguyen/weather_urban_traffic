// The only module allow to touch process.env.

const path = require('path'); // node built-in
const Joi = require('joi');

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// helper function for Joi config schema
const requiredUnlessUrl = (base) =>
	base.when('DATABASE_URL', {
		is: Joi.exist(),
		then: Joi.optional(),
		otherwise: Joi.required(),
	});

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

	DATABASE_URL: Joi.string().uri(),

	DB_HOST: Joi.string().default('localhost'),
	DB_PORT: Joi.number().port().default(5433),
	DB_NAME: requiredUnlessUrl(Joi.string()),
	DB_USER: requiredUnlessUrl(Joi.string()),
	DB_PASS: requiredUnlessUrl(Joi.string().allow('')),

	DB_SSL: Joi.boolean().default(false),
});

// checks process.env against the schema 
// returns object with two properties: value and error.
const { value: env, error } =
	schema.validate(process.env, {
		abortEarly: false,
		stripUnknown: true,
	});

if (error) {
	console.error('Invalid environment configuration (${envFile}):');
	for (const detail of error.details) {
		console.error(`  - ${detail.message}`);
	}
	process.exit(1);
}

const config = Object.freeze({
	env: env.NODE_ENV,
	isProduction: env.NODE_ENV === 'production',
	isTest: env.NODE_ENV === 'test',
	port: env.PORT,
	log: Object.freeze({ level: env.LOG_LEVEL }),
	db: Object.freeze({
		url: env.DATABASE_URL,
		host: env.DB_HOST,
		port: env.DB_PORT,
		name: env.DB_NAME,
		user: env.DB_USER,
		pass: env.DB_PASS,
		ssl: env.DB_SSL,
	}),
});

module.exports = config;