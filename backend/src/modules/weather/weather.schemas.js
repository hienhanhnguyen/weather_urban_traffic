const Joi = require('joi');

const coordinates = {
	lat: Joi.number().min(-90).max(90).required(),
	lon: Joi.number().min(-180).max(180).required(),
	units: Joi.string().valid('metric', 'imperial').default('metric'),
};

module.exports = {
	current: Joi.object(coordinates),
	forecast: Joi.object(coordinates),
};
