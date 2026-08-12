const Joi = require('joi');
const { TOPICS, RANGES } = require('./gov.report');

const window = {
	area_id: Joi.number().integer().min(1),
	timeframe: Joi.string()
		.valid(...RANGES, 'all')
		.default('7d'),
	from: Joi.date().iso(),
	to: Joi.date().iso().when('from', {
		is: Joi.exist(),
		then: Joi.date().min(Joi.ref('from')),
	}),
};

const topics = Joi.array()
	.items(Joi.string().valid(...TOPICS))
	.unique()
	.min(1)
	.default([...TOPICS]);

module.exports = {
	report: Joi.object(window),

	emailReport: Joi.object({ ...window, topics }),

	saveSchedule: Joi.object({
		range: Joi.string()
			.valid(...RANGES)
			.default('7d'),
		topics,
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
