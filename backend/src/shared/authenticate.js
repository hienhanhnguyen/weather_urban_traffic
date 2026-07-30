const { UnauthorizedError } = require('./errors');
const { verifyAccessToken } = require('../modules/auth/auth.tokens');

const BEARER = /^Bearer (\S+)$/;

function authenticate(req, res, next) {
	const header = req.get('authorization');
	const match = header && BEARER.exec(header);

	if (!match) {
		return next(
			new UnauthorizedError('Authentication required', { code: 'NO_TOKEN' })
		);
	}

	const payload = verifyAccessToken(match[1]);

	req.user = {
		id: Number(payload.sub),
		roles: Array.isArray(payload.roles) ? payload.roles : [],
	};

	next();
}

module.exports = authenticate;