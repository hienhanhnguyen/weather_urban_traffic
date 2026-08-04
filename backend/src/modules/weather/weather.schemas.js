const Joi = require('joi');

const coordinates = {
	lat: Joi.number().min(-90).max(90).required(),
	lon: Joi.number().min(-180).max(180).required(),
	units: Joi.string().valid('standard', 'metric', 'imperial').default('metric'),
	lang: Joi.string().max(8).default('en'),
};

module.exports = {
	current: Joi.object(coordinates),
	forecast: Joi.object(coordinates),
	geocode: Joi.object({
		q: Joi.string().trim().min(2).max(120).required(),
		limit: Joi.number().integer().min(1).max(5).default(5),
	}),
};