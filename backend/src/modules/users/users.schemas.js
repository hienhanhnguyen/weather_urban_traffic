const Joi = require('joi');

module.exports = {
	updateProfile: Joi.object({
		username: Joi.string().alphanum().min(3).max(64).allow(null),
	}).min(1),

	updatePreferences: Joi.object({
		language: Joi.string().valid('en', 'vi'),
		timezone: Joi.string().max(64),
		emailAlertsEnabled: Joi.boolean(),
		pushAlertsEnabled: Joi.boolean(),
		minSeverity: Joi.string().valid('info', 'warning', 'critical'),
	}).min(1),

	listUsers: Joi.object({
		page: Joi.number().integer().min(1).default(1),
		limit: Joi.number().integer().min(1).max(100).default(20),
	}),

	setRoles: Joi.object({
		roles: Joi.array()
			.items(Joi.string().valid('user', 'moderator', 'admin'))
			.min(1)
			.unique()
			.required(),
	}),

	userIdParam: Joi.object({
		id: Joi.number().integer().min(1).required(),
	}),
};