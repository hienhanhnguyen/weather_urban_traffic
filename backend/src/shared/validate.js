const { BadRequestError } = require('./errors');

// double arrow structure: (schema, source) => (req, res, next) => {} => factory function/higher-order function
const validate =
	(schema, source = 'body') =>
		(req, res, next) => {
			const { value, error } = schema.validate(req[source], {
				abortEarly: false,
				stripUnknown: true,
				convert: true,
			});

			if (error) {
				return next(
					new BadRequestError('Request validation failed', {
						details: error.details.map((detail) => ({
							field: detail.path.join('.'),
							message: detail.message,
						})),
					})
				);
			}

			if (source === 'query') {
				Object.defineProperty(req, 'query', {
					value,
					writable: true,
					configurable: true,
				});
			} else {
				req[source] = value;
			}

			next();
		};

module.exports = validate;