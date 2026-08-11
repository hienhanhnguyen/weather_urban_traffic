const Joi = require('joi');

const latitude = Joi.number().min(-90).max(90);
const longitude = Joi.number().min(-180).max(180);
const profile = Joi.string().valid('driving', 'cycling', 'walking');

const endpoint = Joi.object({
	latitude: latitude.required(),
	longitude: longitude.required(),
	address: Joi.string().trim().max(1000).allow('', null),
});

const legs = {
	start: endpoint.required(),
	end: endpoint.required(),
	profile: profile.default('driving'),
	distance_m: Joi.number().min(0).allow(null),
	duration_s: Joi.number().min(0).allow(null),
};

const listWindow = {
	page: Joi.number().integer().min(1).default(1),
	limit: Joi.number().integer().min(1).max(100).default(50),
	from: Joi.date().iso(),
	to: Joi.date().iso().when('from', {
		is: Joi.exist(),
		then: Joi.date().min(Joi.ref('from')),
	}),
};

const createRoute = Joi.object({
	name: Joi.string().trim().min(1).max(255).required(),
	...legs,
	save_endpoints: Joi.object({
		start_name: Joi.string().trim().min(1).max(255).required(),
		end_name: Joi.string().trim().min(1).max(255).required(),
	}),
});

module.exports = {
	createRoute,

	updateRoute: Joi.object({
		name: Joi.string().trim().min(1).max(255),
		start: endpoint,
		end: endpoint,
		profile,
		distance_m: Joi.number().min(0).allow(null),
		duration_s: Joi.number().min(0).allow(null),
	}).min(1),

	listRoutes: Joi.object({
		page: Joi.number().integer().min(1).default(1),
		limit: Joi.number().integer().min(1).max(100).default(50),
	}),

	recordRouteSearch: Joi.object(legs),

	listRouteSearches: Joi.object(listWindow),

	recordWeatherSearch: Joi.object({
		location_id: Joi.number().integer().min(1).allow(null),
		label: Joi.string().trim().min(1).max(255).required(),
		latitude: latitude.required(),
		longitude: longitude.required(),
		temperature_c: Joi.number().allow(null),
		condition: Joi.string().trim().max(64).allow('', null),
	}),

	listWeatherSearches: Joi.object(listWindow),

	idParam: Joi.object({
		id: Joi.number().integer().min(1).required(),
	}),
};
