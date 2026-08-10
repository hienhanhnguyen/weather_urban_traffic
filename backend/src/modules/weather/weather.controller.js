const service = require('./weather.service');

module.exports = {
	current: async (req, res) => {
		res.status(200).json({ current: await service.getCurrent(req.query) });
	},

	forecast: async (req, res) => {
		res.status(200).json(await service.getForecast(req.query));
	},
};
