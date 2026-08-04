const service = require('./weather.service');

module.exports = {
	current: async (req, res) => {
		res.status(200).json(await service.getCurrent(req.query));
	},

	forecast: async (req, res) => {
		res.status(200).json(await service.getForecast(req.query));
	},

	geocode: async (req, res) => {
		res.status(200).json(await service.geocode(req.query));
	},
};