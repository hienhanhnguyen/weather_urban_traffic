const { User } = require('./models');
const { UnauthorizedError, ForbiddenError } = require('./errors');

const requireAccountType =
	(...allowed) =>
		async (req, res, next) => {
			if (!req.user) {
				return next(
					new UnauthorizedError('Authentication required', {
						code: 'NO_TOKEN',
					})
				);
			}

			try {
				const user = await User.findByPk(req.user.id, {
					attributes: ['account_type'],
				});

				if (!user || !allowed.includes(user.account_type)) {
					return next(
						new ForbiddenError(
							`This feature is for ${allowed.join(' or ')} accounts`,
							{ code: 'WRONG_ACCOUNT_TYPE' }
						)
					);
				}

				req.user.accountType = user.account_type;
				next();
			} catch (err) {
				next(err);
			}
		};

module.exports = requireAccountType;
