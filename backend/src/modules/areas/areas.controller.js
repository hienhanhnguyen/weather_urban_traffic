const service = require('./areas.service');
const alerts = require('./area.alerts.service');
const heatmapService = require('./area.heatmap.service');

module.exports = {
	list: async (req, res) => {
		res.status(200).json(await service.list(req.user.id));
	},

	heatmap: async (req, res) => {
		res.status(200).json(await heatmapService.heatmap(req.user.id));
	},

	get: async (req, res) => {
		res.status(200).json({
			area: await service.get(req.user.id, Number(req.params.id)),
		});
	},

	create: async (req, res) => {
		res.status(201).json({
			area: await service.create(req.user.id, req.body),
		});
	},

	update: async (req, res) => {
		res.status(200).json({
			area: await service.update(
				req.user.id,
				Number(req.params.id),
				req.body
			),
		});
	},

	remove: async (req, res) => {
		await service.remove(req.user.id, Number(req.params.id));
		res.status(204).send();
	},

	listRules: async (req, res) => {
		res.status(200).json(
			await alerts.listRules(req.user.id, Number(req.params.id))
		);
	},

	replaceRules: async (req, res) => {
		res.status(200).json(
			await alerts.replaceRules(
				req.user.id,
				Number(req.params.id),
				req.body.rules
			)
		);
	},

	evaluateRules: async (req, res) => {
		res.status(200).json(
			await alerts.evaluateNow(req.user.id, Number(req.params.id), {
				force: req.body.force,
			})
		);
	},
};
