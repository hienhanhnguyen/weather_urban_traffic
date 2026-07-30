const { UnauthorizedError, ForbiddenError } = require('./errors');

const authorize =
	(...allowed) =>
		(req, res, next) => {
			if (!req.user) {
				return next(
					new UnauthorizedError('Authentication required', {
						code: 'NO_TOKEN',
					})
				);
			}

			const granted = req.user.roles.some((role) => allowed.includes(role));

			if (!granted) {
				return next(
					new ForbiddenError('Insufficient permissions', {
						code: 'FORBIDDEN',
					})
				);
			}

			next();
		};

module.exports = authorize;