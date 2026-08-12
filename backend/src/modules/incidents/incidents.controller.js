const service = require('./incidents.service');

module.exports = {
	list: async (req, res) => {
		res.status(200).json(await service.list(req.user.id, req.query));
	},

	summary: async (req, res) => {
		res.status(200).json(await service.summary(req.user.id, req.query));
	},

	get: async (req, res) => {
		res.status(200).json(await service.get(req.user.id, Number(req.params.id)));
	},

	updateStatus: async (req, res) => {
		res.status(200).json({
			incident: await service.updateStatus(
				req.user.id,
				Number(req.params.id),
				{ status: req.body.status, note: req.body.note }
			),
		});
	},

	activateScenario: async (req, res) => {
		res.status(200).json(
			await service.activateScenario(
				req.user.id,
				Number(req.params.id),
				req.body.scenario_id
			)
		);
	},
};
