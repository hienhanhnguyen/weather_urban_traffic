const Joi = require('joi');

const ruleBody = Joi.object({
	location_id: Joi.number().integer().min(1).required(),
	metric: Joi.string()
		.valid('temp', 'feelslike', 'precip', 'precipprob')
		.required(),
	operator: Joi.string().valid('>', '>=', '<', '<=').required(),
	threshold: Joi.number().required(),
	unit: Joi.string().max(10),
	scope: Joi.string().valid('current', 'forecast_24h').default('current'),
	severity: Joi.string()
		.valid('info', 'warning', 'critical')
		.default('warning'),
	cooldown_minutes: Joi.number().integer().min(0).max(10_080).default(60),
	is_enabled: Joi.boolean().default(true),
});

module.exports = {
	createRule: ruleBody,

	updateRule: ruleBody
		.fork(
			['location_id', 'metric', 'operator', 'threshold'],
			(schema) => schema.optional()
		)
		.min(1),

	listRules: Joi.object({
		location_id: Joi.number().integer().min(1),
		page: Joi.number().integer().min(1).default(1),
		limit: Joi.number().integer().min(1).max(100).default(50),
	}),

	listEvents: Joi.object({
		is_read: Joi.boolean(),
		severity: Joi.string().valid('info', 'warning', 'critical'),
		from: Joi.date().iso(),
		to: Joi.date().iso().when('from', {
			is: Joi.exist(),
			then: Joi.date().min(Joi.ref('from')),
		}),
		page: Joi.number().integer().min(1).default(1),
		limit: Joi.number().integer().min(1).max(100).default(50),
	}),

	idParam: Joi.object({
		id: Joi.number().integer().min(1).required(),
	}),
	pushSubscription: Joi.object({
		endpoint: Joi.string().uri({ scheme: ['https'] }).max(2000).required(),
		keys: Joi.object({
			p256dh: Joi.string().max(255).required(),
			auth: Joi.string().max(255).required(),
		}).required(),
		user_agent: Joi.string().max(255).allow('', null),
	}),
};