// 404 for unmatched routes. Mount after all routes, before errorHandler
const { AppError, NotFoundError } = require('./errors');
const logger = require('./logger');

const GENERIC_MESSAGE = 'Internal server error';


// Wrap anything that isn't an AppError, so the rest of the handler has one shape
function normalise(err) {
	if (err instanceof AppError) return err;

	const wrapped = new AppError(GENERIC_MESSAGE, {
		statusCode: 500,
		code: 'INTERNAL_ERROR',
	});
	wrapped.isOperational = false;
	wrapped.cause = err;
	wrapped.stack = err instanceof Error ? err.stack : wrapped.stack;

	return wrapped;
}


// 404 for unmatched routes. Mount after all routes, before errorHandler
function notFoundHandler(req, res, next) {
	next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`));
}

function errorHandler(err, req, res, next) {
	const error = normalise(err);
	const where = `${req.method} ${req.originalUrl}`;

	// the log cal
	const context = {
		code: error.code,
		statusCode: error.statusCode,
		method: req.method,
		url: req.originalUrl,
	};

	if (error.isOperational) {
		logger.warn(context, error.message);
	} else {
		logger.error({ ...context, err: error }, 'unhandled error');
	}

	const body = { error: { code: error.code, message: error.message } };
	if (error.details !== undefined) {
		body.error.details = error.details;
	}

	res.status(error.statusCode).json(body);
}

module.exports = { notFoundHandler, errorHandler };
