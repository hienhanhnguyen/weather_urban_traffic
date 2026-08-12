const Joi = require('joi');
const {
	METRICS,
	SEVERITIES,
	STATUSES,
	PRIORITIES,
	MAX_STEPS,
} = require('./scenario.plan');

const name = Joi.string().trim().min(1).max(120);
const description = Joi.string().trim().max(1000).allow(null, '');
const metric = Joi.string()
	.valid(...METRICS)
	.allow(null);
const minSeverity = Joi.string().valid(...SEVERITIES);
const status = Joi.string().valid(...STATUSES);

const steps = Joi.array()
	.items(
		Joi.object({
			content: Joi.string().trim().min(1).max(500).required(),
			priority: Joi.string()
				.valid(...PRIORITIES)
				.default('medium'),
		})
	)
	.max(MAX_STEPS);

module.exports = {
	list: Joi.object({
		q: Joi.string().trim().max(120),
		status,
		metric: Joi.string().valid(...METRICS, 'any'),
	}),

	create: Joi.object({
		name: name.required(),
		description: description.default(null),
		metric: metric.default(null),
		min_severity: minSeverity.default('info'),
		status: status.default('active'),
		steps: steps.default([]),
	}),

	update: Joi.object({
		name,
		description,
		metric,
		min_severity: minSeverity,
		status,
		steps,
	}).min(1),

	idParam: Joi.object({
		id: Joi.number().integer().min(1).required(),
	}),
};
