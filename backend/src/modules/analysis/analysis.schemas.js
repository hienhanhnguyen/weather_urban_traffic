const Joi = require('joi');

module.exports = {
	assess: Joi.object({
		lat: Joi.number().min(-90).max(90).required(),
		lon: Joi.number().min(-180).max(180).required(),
		to_lat: Joi.number().min(-90).max(90),
		to_lon: Joi.number().min(-180).max(180),
		depart_at: Joi.date().iso().required(),
	}).and('to_lat', 'to_lon'),
};
