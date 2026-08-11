const service = require('./analysis.service');

module.exports = {
	assess: async (req, res) => {
		res.status(200).json(await service.assessTrip(req.query));
	},
};
