const Joi = require('joi');

const latitude = Joi.number().min(-90).max(90);
const longitude = Joi.number().min(-180).max(180);

const base = Joi.object({
	custom_name: Joi.string().trim().min(1).max(255).required(),
	address: Joi.string().trim().max(1000).allow('', null),
	latitude: latitude.required(),
	longitude: longitude.required(),
});

module.exports = {
	create: base,

	update: base.fork(
		['custom_name', 'latitude', 'longitude'],
		(schema) => schema.optional()
	).min(1),

	idParam: Joi.object({
		id: Joi.number().integer().min(1).required(),
	}),

	list: Joi.object({
		page: Joi.number().integer().min(1).default(1),
		limit: Joi.number().integer().min(1).max(100).default(50),
	}),
};