const Joi = require('joi');
const { SEVERITIES, STATUSES, TIMEFRAMES } = require('./incidents.report');

const filters = {
	area_id: Joi.number().integer().min(1),
	severity: Joi.string().valid(...SEVERITIES),
	status: Joi.string().valid(...STATUSES),
	metric: Joi.string().valid('temp', 'feelslike', 'precip', 'precipprob'),
	timeframe: Joi.string().valid(...Object.keys(TIMEFRAMES), 'all'),
	from: Joi.date().iso(),
	to: Joi.date().iso().when('from', {
		is: Joi.exist(),
		then: Joi.date().min(Joi.ref('from')),
	}),
};

module.exports = {
	list: Joi.object({
		...filters,
		page: Joi.number().integer().min(1).default(1),
		limit: Joi.number().integer().min(1).max(100).default(20),
	}),

	summary: Joi.object(filters),

	updateStatus: Joi.object({
		status: Joi.string()
			.valid(...STATUSES)
			.required(),
		note: Joi.string().max(500).allow('', null),
	}),

	activateScenario: Joi.object({
		scenario_id: Joi.number().integer().min(1).allow(null).required(),
	}),

	idParam: Joi.object({
		id: Joi.number().integer().min(1).required(),
	}),
};
