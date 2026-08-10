const Joi = require('joi');

const latitude = Joi.number().min(-90).max(90);
const longitude = Joi.number().min(-180).max(180);

module.exports = {
	search: Joi.object({
		q: Joi.string().trim().min(2).max(200).required(),
		// Optional focus point.
		lat: latitude,
		lng: longitude,
		limit: Joi.number().integer().min(1).max(10).default(5),
	})
		.and('lat', 'lng'),

	reverse: Joi.object({
		lat: latitude.required(),
		lng: longitude.required(),
	}),

	route: Joi.object({
		fromLat: latitude.required(),
		fromLng: longitude.required(),
		toLat: latitude.required(),
		toLng: longitude.required(),
		profile: Joi.string().valid('driving', 'walking', 'cycling').default('driving'),
	}),
};
