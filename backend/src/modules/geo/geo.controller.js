const service = require('./geo.service');

module.exports = {
	search: async (req, res) => {
		res.status(200).json(await service.search(req.query));
	},

	reverse: async (req, res) => {
		res.status(200).json(await service.reverse(req.query));
	},

	route: async (req, res) => {
		res.status(200).json(await service.route(req.query));
	},
};
