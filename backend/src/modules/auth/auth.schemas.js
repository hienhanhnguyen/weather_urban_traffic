const Joi = require('joi');

const email = Joi.string()
	.email({ minDomainSegments: 2, tlds: false })
	.max(255)
	.required();

const newPassword = Joi.string().min(8).max(72).required();

const otpCode = Joi.string()
	.length(6)
	.pattern(/^\d+$/)
	.required();

module.exports = {
	signUp: Joi.object({
		email,
		password: newPassword,
		username: Joi.string().alphanum().min(3).max(64),
		// Sign up only for normal users
		// Privileged access: ('admin_officer' and the 'admin'/'moderator' roles)
		// Granted through PUT /users/:id/roles 
		accountType: Joi.string()
			.valid('individual', 'business')
			.default('individual'),
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
		code: otpCode,
	}),

	resetPassword: Joi.object({
		resetToken: Joi.string().required(),
		newPassword,
	}),

	changePassword: Joi.object({
		currentPassword: Joi.string().max(72).required(),
		newPassword,
	}),

	verifyEmail: Joi.object({
		code: otpCode,
	}),
};