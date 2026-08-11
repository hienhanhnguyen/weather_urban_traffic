const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const config = require('./config');
const { TooManyRequestsError } = require('./errors');

const MINUTE = 60_000;

// x => expr returns expr directly, so build function returns whatever rateLimit({...}) returns
const build = ({ windowMs, limit, keyGenerator }) =>
	rateLimit({
		windowMs,
		limit,
		standardHeaders: 'draft-7',
		legacyHeaders: false,
		skip: () => config.isTest,
		...(keyGenerator ? { keyGenerator } : {}),
		handler: (req, res, next) =>
			next(
				new TooManyRequestsError(
					'Too many requests — please try again later'
				)
			),
	});

const byIpAndEmail = (req) =>
	`${ipKeyGenerator(req.ip)}:${String(req.body?.email ?? '').toLowerCase()}`;

const byUserId = (req) =>
	req.user?.id ? `user:${req.user.id}` : ipKeyGenerator(req.ip);

module.exports = {
	signUpLimiter: build({ windowMs: 60 * MINUTE, limit: 5 }),
	signInLimiter: build({ windowMs: 15 * MINUTE, limit: 10 }),
	forgotLimiter: build({
		windowMs: 60 * MINUTE,
		limit: 3,
		keyGenerator: byIpAndEmail,
	}),
	otpLimiter: build({
		windowMs: 15 * MINUTE,
		limit: 10,
		keyGenerator: byIpAndEmail,
	}),
	emailVerifySendLimiter: build({
		windowMs: 60 * MINUTE,
		limit: 5,
		keyGenerator: byUserId,
	}),
	emailVerifyCheckLimiter: build({
		windowMs: 15 * MINUTE,
		limit: 10,
		keyGenerator: byUserId,
	}),
	passwordChangeLimiter: build({
		windowMs: 15 * MINUTE,
		limit: 10,
		keyGenerator: byUserId,
	}),
	reportEmailLimiter: build({
		windowMs: 60 * MINUTE,
		limit: 5,
		keyGenerator: byUserId,
	}),
	areaEvaluateLimiter: build({
		windowMs: 15 * MINUTE,
		limit: 10,
		keyGenerator: byUserId,
	}),
	weatherLimiter: build({ windowMs: MINUTE, limit: 60 }),
	geoLimiter: build({ windowMs: MINUTE, limit: 90, keyGenerator: byUserId }),
};