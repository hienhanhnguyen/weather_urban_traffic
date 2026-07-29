const test = require('node:test');
const assert = require('node:assert');
const {
	AppError,
	BadRequestError,
	NotFoundError,
} = require('../src/shared/errors');

test('NotFoundError carries its status code and machine code', () => {
	const err = new NotFoundError('user not found');
	assert.strictEqual(err.statusCode, 404);
	assert.strictEqual(err.code, 'NOT_FOUND');
	assert.strictEqual(err.message, 'user not found');
});

test('NotFoundError sits correctly in the prototype chain', () => {
	const err = new NotFoundError('nope');
	assert.ok(err instanceof NotFoundError);
	assert.ok(err instanceof AppError);
	assert.ok(err instanceof Error);
	assert.strictEqual(err.name, 'NotFoundError');
});

test('deliberately raised errors are operational', () => {
	assert.strictEqual(new BadRequestError('bad').isOperational, true);
});

test('a caller may override the code but not the status', () => {
	const err = new BadRequestError('email taken', { code: 'EMAIL_IN_USE' });
	assert.strictEqual(err.code, 'EMAIL_IN_USE');
	assert.strictEqual(err.statusCode, 400);
});