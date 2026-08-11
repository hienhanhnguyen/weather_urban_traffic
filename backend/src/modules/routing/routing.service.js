const { Op } = require('sequelize');
const {
	sequelize,
	SavedRoute,
	RouteSearch,
	WeatherSearch,
} = require('../../shared/models');
const locationsService = require('../locations/locations.service');
const config = require('../../shared/config');
const { NotFoundError, ConflictError } = require('../../shared/errors');

const round6 = (value) => Math.round(value * 1e6) / 1e6;

const publicRoute = (route) => ({
	id: route.route_id,
	name: route.name,
	start: {
		latitude: route.start_latitude,
		longitude: route.start_longitude,
		address: route.start_address,
	},
	end: {
		latitude: route.end_latitude,
		longitude: route.end_longitude,
		address: route.end_address,
	},
	profile: route.profile,
	distanceM: route.distance_m,
	durationS: route.duration_s,
	createdAt: route.createdAt,
	updatedAt: route.updatedAt,
});

const publicRouteSearch = (search) => ({
	id: search.search_id,
	start: {
		latitude: search.start_latitude,
		longitude: search.start_longitude,
		address: search.start_address,
	},
	end: {
		latitude: search.end_latitude,
		longitude: search.end_longitude,
		address: search.end_address,
	},
	profile: search.profile,
	distanceM: search.distance_m,
	durationS: search.duration_s,
	searchedAt: search.searched_at,
});

const publicWeatherSearch = (search) => ({
	id: search.search_id,
	locationId: search.location_id,
	label: search.label,
	latitude: search.latitude,
	longitude: search.longitude,
	temperatureC: search.temperature_c,
	condition: search.condition,
	searchedAt: search.searched_at,
});

const legColumns = ({ start, end, profile, distance_m, duration_s }) => ({
	start_latitude: round6(start.latitude),
	start_longitude: round6(start.longitude),
	start_address: start.address ?? null,
	end_latitude: round6(end.latitude),
	end_longitude: round6(end.longitude),
	end_address: end.address ?? null,
	profile,
	distance_m: distance_m ?? null,
	duration_s: duration_s ?? null,
});

const dedupeSince = () =>
	new Date(Date.now() - config.limits.searchDedupeMinutes * 60_000);

// A share window filter for both history lists.
const searchedWithin = ({ from, to }) => {
	if (from === undefined && to === undefined) return {};
	return {
		searched_at: {
			...(from !== undefined && { [Op.gte]: from }),
			...(to !== undefined && { [Op.lte]: to }),
		},
	};
};

async function ownedRouteOrFail(userId, routeId) {
	const route = await SavedRoute.findOne({
		where: { route_id: routeId, user_id: userId },
	});
	if (!route) throw new NotFoundError('Route not found');
	return route;
}

async function listRoutes(userId, { page, limit }) {
	const { rows, count } = await SavedRoute.findAndCountAll({
		where: { user_id: userId },
		order: [['route_id', 'ASC']],
		limit,
		offset: (page - 1) * limit,
	});

	return {
		routes: rows.map(publicRoute),
		pagination: { page, limit, total: count },
	};
}

async function getRoute(userId, routeId) {
	return publicRoute(await ownedRouteOrFail(userId, routeId));
}

async function createRoute(userId, { name, save_endpoints, ...legs }) {
	const existing = await SavedRoute.count({ where: { user_id: userId } });

	if (existing >= config.limits.maxSavedRoutes) {
		throw new ConflictError(
			`You can save at most ${config.limits.maxSavedRoutes} routes`,
			{ code: 'ROUTE_LIMIT_REACHED' }
		);
	}

	const columns = legColumns(legs);

	return sequelize.transaction(async (transaction) => {
		const route = await SavedRoute.create(
			{ ...columns, name, user_id: userId },
			{ transaction }
		);

		if (!save_endpoints) return { route: publicRoute(route), locations: [] };

		const locations = await locationsService.createMany(
			userId,
			[
				{
					custom_name: save_endpoints.start_name,
					address: columns.start_address,
					latitude: columns.start_latitude,
					longitude: columns.start_longitude,
				},
				{
					custom_name: save_endpoints.end_name,
					address: columns.end_address,
					latitude: columns.end_latitude,
					longitude: columns.end_longitude,
				},
			],
			transaction
		);

		return { route: publicRoute(route), locations };
	});
}

async function updateRoute(userId, routeId, patch) {
	const route = await ownedRouteOrFail(userId, routeId);

	const { name, start, end, ...rest } = patch;
	const columns = {
		...(name !== undefined && { name }),
		...(start !== undefined && {
			start_latitude: round6(start.latitude),
			start_longitude: round6(start.longitude),
			start_address: start.address ?? null,
		}),
		...(end !== undefined && {
			end_latitude: round6(end.latitude),
			end_longitude: round6(end.longitude),
			end_address: end.address ?? null,
		}),
		...rest,
	};

	await route.update(columns);
	return publicRoute(route);
}

async function removeRoute(userId, routeId) {
	const route = await ownedRouteOrFail(userId, routeId);
	await route.destroy();
}

async function recordRouteSearch(userId, body) {
	const columns = legColumns(body);

	const recent = await RouteSearch.findOne({
		where: {
			user_id: userId,
			start_latitude: columns.start_latitude,
			start_longitude: columns.start_longitude,
			end_latitude: columns.end_latitude,
			end_longitude: columns.end_longitude,
			profile: columns.profile,
			searched_at: { [Op.gte]: dedupeSince() },
		},
		order: [['searched_at', 'DESC']],
	});

	if (recent) {
		await recent.update({ ...columns, searched_at: new Date() });
		return publicRouteSearch(recent);
	}

	const search = await RouteSearch.create({
		...columns,
		user_id: userId,
		searched_at: new Date(),
	});

	return publicRouteSearch(search);
}

async function listRouteSearches(userId, { page, limit, from, to }) {
	const { rows, count } = await RouteSearch.findAndCountAll({
		where: { user_id: userId, ...searchedWithin({ from, to }) },
		order: [['searched_at', 'DESC']],
		limit,
		offset: (page - 1) * limit,
	});

	return {
		searches: rows.map(publicRouteSearch),
		pagination: { page, limit, total: count },
	};
}

async function clearRouteSearches(userId) {
	return RouteSearch.destroy({ where: { user_id: userId } });
}

async function recordWeatherSearch(userId, body) {
	const latitude = round6(body.latitude);
	const longitude = round6(body.longitude);

	if (body.location_id !== undefined && body.location_id !== null) {
		await locationsService.ownedOrFail(userId, body.location_id);
	}

	const columns = {
		location_id: body.location_id ?? null,
		label: body.label,
		latitude,
		longitude,
		temperature_c: body.temperature_c ?? null,
		condition: body.condition ?? null,
	};

	const recent = await WeatherSearch.findOne({
		where: {
			user_id: userId,
			latitude,
			longitude,
			searched_at: { [Op.gte]: dedupeSince() },
		},
		order: [['searched_at', 'DESC']],
	});

	if (recent) {
		await recent.update({ ...columns, searched_at: new Date() });
		return publicWeatherSearch(recent);
	}

	const search = await WeatherSearch.create({
		...columns,
		user_id: userId,
		searched_at: new Date(),
	});

	return publicWeatherSearch(search);
}

async function listWeatherSearches(userId, { page, limit, from, to }) {
	const { rows, count } = await WeatherSearch.findAndCountAll({
		where: { user_id: userId, ...searchedWithin({ from, to }) },
		order: [['searched_at', 'DESC']],
		limit,
		offset: (page - 1) * limit,
	});

	return {
		searches: rows.map(publicWeatherSearch),
		pagination: { page, limit, total: count },
	};
}

async function clearWeatherSearches(userId) {
	return WeatherSearch.destroy({ where: { user_id: userId } });
}

module.exports = {
	listRoutes,
	getRoute,
	createRoute,
	updateRoute,
	removeRoute,
	recordRouteSearch,
	listRouteSearches,
	clearRouteSearches,
	recordWeatherSearch,
	listWeatherSearches,
	clearWeatherSearches,
};
