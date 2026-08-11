const Joi = require('joi');

const timeRange = Joi.string().valid('24h', '7d').default('24h');

module.exports = {
	report: Joi.object({
		route_id: Joi.number().integer().min(1).required(),
		range: timeRange,
		units: Joi.string().valid('metric', 'imperial').default('metric'),
	}),

	saveSchedule: Joi.object({
		route_id: Joi.number().integer().min(1).required(),
		range: timeRange,
		frequency: Joi.string().valid('weekly', 'monthly').required(),
		weekday: Joi.number()
			.integer()
			.min(0)
			.max(6)
			.when('frequency', {
				is: 'weekly',
				then: Joi.required(),
				otherwise: Joi.forbidden(),
			}),
		day_of_month: Joi.number()
			.integer()
			.min(1)
			.max(28)
			.when('frequency', {
				is: 'monthly',
				then: Joi.required(),
				otherwise: Joi.forbidden(),
			}),
		hour: Joi.number().integer().min(0).max(23).default(7),
	}),
};
