const Joi = require('joi');

const email = Joi.string()
	.email({ minDomainSegments: 2, tlds: false })
	.max(255)
	.required();

const newPassword = Joi.string().min(8).max(72).required();

module.exports = {
	signUp: Joi.object({
		email,
		password: newPassword,
		username: Joi.string().alphanum().min(3).max(64),
	}),

	signIn: Joi.object({
		email,
		password: Joi.string().max(72).required(),
	}),

	google: Joi.object({
		idToken: Joi.string().required(),
	}),

	refresh: Joi.object({
		refreshToken: Joi.string().required(),
	}),

	forgotPassword: Joi.object({
		email,
	}),

	verifyOtp: Joi.object({
		email,
		code: Joi.string()
			.length(6)
			.pattern(/^\d+$/)
			.required(),
	}),

	resetPassword: Joi.object({
		resetToken: Joi.string().required(),
		newPassword,
	}),
};