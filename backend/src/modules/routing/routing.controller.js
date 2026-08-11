const service = require('./routing.service');

module.exports = {
	list: async (req, res) => {
		res.status(200).json(await service.listRoutes(req.user.id, req.query));
	},

	get: async (req, res) => {
		res.status(200).json({
			route: await service.getRoute(req.user.id, Number(req.params.id)),
		});
	},

	create: async (req, res) => {
		res.status(201).json(await service.createRoute(req.user.id, req.body));
	},

	update: async (req, res) => {
		res.status(200).json({
			route: await service.updateRoute(
				req.user.id,
				Number(req.params.id),
				req.body
			),
		});
	},

	remove: async (req, res) => {
		await service.removeRoute(req.user.id, Number(req.params.id));
		res.status(204).send();
	},

	recordRouteSearch: async (req, res) => {
		res.status(201).json({
			search: await service.recordRouteSearch(req.user.id, req.body),
		});
	},

	listRouteSearches: async (req, res) => {
		res.status(200).json(
			await service.listRouteSearches(req.user.id, req.query)
		);
	},

	clearRouteSearches: async (req, res) => {
		res.status(200).json({
			deleted: await service.clearRouteSearches(req.user.id),
		});
	},

	recordWeatherSearch: async (req, res) => {
		res.status(201).json({
			search: await service.recordWeatherSearch(req.user.id, req.body),
		});
	},

	listWeatherSearches: async (req, res) => {
		res.status(200).json(
			await service.listWeatherSearches(req.user.id, req.query)
		);
	},

	clearWeatherSearches: async (req, res) => {
		res.status(200).json({
			deleted: await service.clearWeatherSearches(req.user.id),
		});
	},
};
