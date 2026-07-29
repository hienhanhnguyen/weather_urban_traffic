// Base for every error raise on purpose

class AppError extends Error {
	constructor(message, { statusCode = 500, code = 'INTERNAL_ERROR', details } = {}) {
		super(message);

		this.name = new.target.name;
		this.statusCode = statusCode;
		this.code = code;
		this.details = details;
		this.isOperational = true;

		Error.captureStackTrace(this, new.target);
	}
}

class BadRequestError extends AppError {
	constructor(message = 'Invalid request', options = {}) {
		super(message, { code: 'VALIDATION_ERROR', ...options, statusCode: 400 });
	}
}

class UnauthorizedError extends AppError {
	constructor(message = 'Authentication required', options = {}) {
		super(message, { code: 'UNAUTHORIZED', ...options, statusCode: 401 });
	}
}

class ForbiddenError extends AppError {
	constructor(message = 'Insufficient permissions', options = {}) {
		super(message, { code: 'FORBIDDEN', ...options, statusCode: 403 });
	}
}

class NotFoundError extends AppError {
	constructor(message = 'Resource not found', options = {}) {
		super(message, { code: 'NOT_FOUND', ...options, statusCode: 404 });
	}
}

class ConflictError extends AppError {
	constructor(message = 'Resource already exists', options = {}) {
		super(message, { code: 'CONFLICT', ...options, statusCode: 409 });
	}
}

class TooManyRequestsError extends AppError {
	constructor(message = 'Too many requests', options = {}) {
		super(message, { code: 'RATE_LIMITED', ...options, statusCode: 429 });
	}
}

module.exports = {
	AppError,
	BadRequestError,
	UnauthorizedError,
	ForbiddenError,
	NotFoundError,
	ConflictError,
	TooManyRequestsError,
};