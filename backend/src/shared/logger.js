const pino = require('pino');
const config = require('./config');

// hide sensitive information in logs
const redactPaths = [
	'password',
	'*.password',
	'newPassword',
	'*.newPassword',
	'password_hash',
	'*.password_hash',
	'token',
	'*.token',
	'accessToken',
	'*.accessToken',
	'refreshToken',
	'*.refreshToken',
	'otp',
	'*.otp',
	'req.headers.authorization',
	'req.headers.cookie',
	'res.headers["set-cookie"]',
	'pass',
	'*.pass',
	'secret',
	'*.secret',
	'code_hash',
	'*.code_hash',
	'token_hash',
	'*.token_hash',
	'resetToken',
	'*.resetToken',
	'idToken',
	'*.idToken',
	'appid',
	'*.appid',
	'apiKey',
	'*.apiKey',
];


const logger = pino({
	level: config.log.level,
	redact: {
		paths: redactPaths,
		censor: '[Redacted]',
	},
	...(config.isProduction
		? {}
		: {
			transport: {
				target: 'pino-pretty',
				options: {
					colorize: true,
					translateTime: 'HH:MM:ss',
					ignore: 'pid,hostname',
				},
			},
		}),
});

module.exports = logger;