const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../../shared/config');
const { UnauthorizedError } = require('../../shared/errors');

const sha256 = (value) =>
	crypto.createHash('sha256').update(value).digest('hex');

const randomToken = () => crypto.randomBytes(32).toString('base64url');

const generateOtp = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

const safeEqual = (a, b) => {
	const bufA = Buffer.from(String(a));
	const bufB = Buffer.from(String(b));
	if (bufA.length !== bufB.length) return false;
	return crypto.timingSafeEqual(bufA, bufB);
};

const signAccessToken = (user, roles) =>
	jwt.sign({ roles }, config.auth.accessSecret, {
		subject: String(user.user_id),
		expiresIn: config.auth.accessTtl,
	});

const verifyAccessToken = (token) => {
	try {
		return jwt.verify(token, config.auth.accessSecret);
	} catch {
		throw new UnauthorizedError('Invalid or expired token', {
			code: 'INVALID_TOKEN',
		});
	}
};

module.exports = {
	sha256,
	randomToken,
	generateOtp,
	safeEqual,
	signAccessToken,
	verifyAccessToken,
};