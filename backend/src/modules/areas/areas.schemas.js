const Joi = require('joi');
const { MIN_POSITIONS, MAX_POSITIONS } = require('./area.polygon');
const { METRICS, METRIC_RANGE } = require('./area.alert.rules');

const position = Joi.array()
	.length(2)
	.ordered(
		Joi.number().min(-180).max(180).required(),
		Joi.number().min(-90).max(90).required()
	);

const boundary = Joi.object({
	type: Joi.string().valid('Polygon').required(),
	coordinates: Joi.array()
		.items(
			Joi.array().items(position).min(MIN_POSITIONS).max(MAX_POSITIONS)
		)
		.min(1)
		.max(1)
		.required(),
});

const MAX_COOLDOWN_MINUTES = 10_080; // a week

const inRange = (rule, helpers) => {
	const range = METRIC_RANGE[rule.metric];

	if (rule.threshold < range.min || rule.threshold > range.max) {
		return helpers.error('any.invalid');
	}

	return rule;
};

const name = Joi.string().trim().min(1).max(120);
const areaType = Joi.string().valid('district', 'ward');
const address = Joi.string().trim().max(255).allow(null, '');

module.exports = {
	create: Joi.object({
		name: name.required(),
		area_type: areaType.default('ward'),
		address: address.default(null),
		boundary: boundary.required(),
	}),

	update: Joi.object({
		name,
		area_type: areaType,
		address,
		boundary,
	}).min(1),

	idParam: Joi.object({
		id: Joi.number().integer().min(1).required(),
	}),

	replaceRules: Joi.object({
		rules: Joi.array()
			.items(
				Joi.object({
					metric: Joi.string().valid(...METRICS).required(),
					threshold: Joi.number().required(),
					severity: Joi.string()
						.valid('info', 'warning', 'critical')
						.default('warning'),
					cooldown_minutes: Joi.number()
						.integer()
						.min(0)
						.max(MAX_COOLDOWN_MINUTES)
						.default(60),
					is_enabled: Joi.boolean().default(true),
				})
					.custom(inRange)
			)
			.max(METRICS.length)
			.unique('metric')
			.required(),
	}),

	evaluate: Joi.object({
		force: Joi.boolean().default(false),
	}),
};
