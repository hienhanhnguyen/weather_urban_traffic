// The only module allow to touch process.env.

const path = require('path'); // node built-in
const Joi = require('joi');

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';

require('dotenv').config({
	path: path.resolve(__dirname, '../..', envFile),
	quiet: true,
});

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

	JWT_ACCESS_SECRET: Joi.string().min(32).required(),
	JWT_ACCESS_TTL: Joi.string().default('15m'),
	JWT_REFRESH_TTL_DAYS: Joi.number().integer().min(1).default(30),
	BCRYPT_ROUNDS: Joi.number().integer().min(4).max(15).default(12),
	OTP_TTL_MINUTES: Joi.number().integer().min(1).default(10),
	OTP_MAX_ATTEMPTS: Joi.number().integer().min(1).default(5),
	RESET_TOKEN_TTL_MINUTES: Joi.number().integer().min(1).default(15),
	GOOGLE_CLIENT_ID: Joi.string().allow('').default(''),

	WEATHER_URL: Joi.string().uri().default('https://api.open-meteo.com'),
	WEATHER_TIMEOUT_MS: Joi.number().integer().min(1000).default(15_000),
	WEATHER_CACHE_CURRENT_TTL_MS: Joi.number().integer().min(0).default(600_000),
	WEATHER_CACHE_FORECAST_TTL_MS: Joi.number().integer().min(0).default(3_600_000),
	MAX_SAVED_LOCATIONS: Joi.number().integer().min(1).default(50),
	MAX_SAVED_ROUTES: Joi.number().integer().min(1).default(50),
	SEARCH_DEDUPE_MINUTES: Joi.number().integer().min(0).default(30),

	GEOCODER_URL: Joi.string().uri().default('https://photon.komoot.io'),
	ROUTER_URL: Joi.string().uri().default('https://routing.openstreetmap.de'),
	GEO_USER_AGENT: Joi.string().default('SWTIS/1.0 (thesis project)'),
	GEO_TIMEOUT_MS: Joi.number().integer().min(1000).default(8_000),
	GEO_CACHE_SEARCH_TTL_MS: Joi.number().integer().min(0).default(600_000),
	GEO_CACHE_REVERSE_TTL_MS: Joi.number().integer().min(0).default(86_400_000),
	GEO_CACHE_ROUTE_TTL_MS: Joi.number().integer().min(0).default(600_000),

	SMTP_HOST: Joi.string().allow('').default(''),
	SMTP_PORT: Joi.number().port().default(587),
	SMTP_USER: Joi.string().allow('').default(''),
	SMTP_PASS: Joi.string().allow('').default(''),
	SMTP_FROM: Joi.string().default('no-reply@example.com'),
	SMTP_SECURE: Joi.boolean().default(false),

	PUSH_ENABLED: Joi.boolean().default(false),
	VAPID_PUBLIC_KEY: Joi.string().allow('').default('').when('PUSH_ENABLED', {
		is: Joi.any().valid(true, 'true'),
		then: Joi.string().min(1).required(),
	}),
	VAPID_PRIVATE_KEY: Joi.string().allow('').default('').when('PUSH_ENABLED', {
		is: Joi.any().valid(true, 'true'),
		then: Joi.string().min(1).required(),
	}),
	VAPID_SUBJECT: Joi.string().default('mailto:admin@example.com'),

	CORS_ALLOWED_ORIGINS: Joi.string()
		.allow('')
		.default('http://localhost:3001'),

	WS_ALLOWED_ORIGINS: Joi.string().allow('').default(''),
	WS_MAX_CONNECTIONS_PER_USER: Joi.number().integer().min(1).default(5),
	WS_HEARTBEAT_MS: Joi.number().integer().min(1000).default(30_000),

	ALERT_WORKER_ENABLED: Joi.boolean().default(true),
	ALERT_EVAL_INTERVAL_MINUTES: Joi.number().integer().min(1).default(15),
	REPORT_WORKER_ENABLED: Joi.boolean().default(true),
	REPORT_INTERVAL_MINUTES: Joi.number().integer().min(1).default(15),
	CLEANUP_INTERVAL_MINUTES: Joi.number().integer().min(1).default(60),
	CLEANUP_GRACE_DAYS: Joi.number().integer().min(1).default(30),
	SHUTDOWN_TIMEOUT_MS: Joi.number().integer().min(1000).default(10_000),
});

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

const csv = (value) =>
	Object.freeze(
		value
			.split(',')
			.map((item) => item.trim())
			.filter(Boolean)
	);

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
	auth: Object.freeze({
		accessSecret: env.JWT_ACCESS_SECRET,
		accessTtl: env.JWT_ACCESS_TTL,
		refreshTtlDays: env.JWT_REFRESH_TTL_DAYS,
		bcryptRounds: env.BCRYPT_ROUNDS,
		otpTtlMinutes: env.OTP_TTL_MINUTES,
		otpMaxAttempts: env.OTP_MAX_ATTEMPTS,
		resetTokenTtlMinutes: env.RESET_TOKEN_TTL_MINUTES,
		googleClientId: env.GOOGLE_CLIENT_ID,
	}),
	weather: Object.freeze({
		baseUrl: env.WEATHER_URL.replace(/\/+$/, ''),
		timeoutMs: env.WEATHER_TIMEOUT_MS,
		currentTtlMs: env.WEATHER_CACHE_CURRENT_TTL_MS,
		forecastTtlMs: env.WEATHER_CACHE_FORECAST_TTL_MS,
	}),

	geo: Object.freeze({
		geocoderUrl: env.GEOCODER_URL.replace(/\/+$/, ''),
		routerUrl: env.ROUTER_URL.replace(/\/+$/, ''),
		userAgent: env.GEO_USER_AGENT,
		timeoutMs: env.GEO_TIMEOUT_MS,
		searchTtlMs: env.GEO_CACHE_SEARCH_TTL_MS,
		reverseTtlMs: env.GEO_CACHE_REVERSE_TTL_MS,
		routeTtlMs: env.GEO_CACHE_ROUTE_TTL_MS,
	}),

	limits: Object.freeze({
		maxSavedLocations: env.MAX_SAVED_LOCATIONS,
		maxSavedRoutes: env.MAX_SAVED_ROUTES,
		searchDedupeMinutes: env.SEARCH_DEDUPE_MINUTES,
	}),

	mail: Object.freeze({
		host: env.SMTP_HOST,
		port: env.SMTP_PORT,
		user: env.SMTP_USER,
		pass: env.SMTP_PASS,
		from: env.SMTP_FROM,
		secure: env.SMTP_SECURE,
	}),

	push: Object.freeze({
		enabled: env.PUSH_ENABLED,
		publicKey: env.VAPID_PUBLIC_KEY,
		privateKey: env.VAPID_PRIVATE_KEY,
		subject: env.VAPID_SUBJECT,
	}),

	http: Object.freeze({
		allowedOrigins: csv(env.CORS_ALLOWED_ORIGINS),
	}),

	realtime: Object.freeze({
		allowedOrigins: csv(env.WS_ALLOWED_ORIGINS),
		maxConnectionsPerUser: env.WS_MAX_CONNECTIONS_PER_USER,
		heartbeatMs: env.WS_HEARTBEAT_MS,
	}),

	jobs: Object.freeze({
		alertWorkerEnabled: env.ALERT_WORKER_ENABLED,
		alertIntervalMinutes: env.ALERT_EVAL_INTERVAL_MINUTES,
		reportWorkerEnabled: env.REPORT_WORKER_ENABLED,
		reportIntervalMinutes: env.REPORT_INTERVAL_MINUTES,
		cleanupIntervalMinutes: env.CLEANUP_INTERVAL_MINUTES,
		cleanupGraceDays: env.CLEANUP_GRACE_DAYS,
	}),

	shutdownTimeoutMs: env.SHUTDOWN_TIMEOUT_MS,
});

module.exports = config;