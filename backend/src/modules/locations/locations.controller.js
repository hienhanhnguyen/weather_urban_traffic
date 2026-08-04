const service = require('./locations.service');

module.exports = {
	list: async (req, res) => {
		res.status(200).json(await service.list(req.user.id, req.query));
	},

	get: async (req, res) => {
		res.status(200).json({
			location: await service.get(req.user.id, Number(req.params.id)),
		});
	},

	create: async (req, res) => {
		res.status(201).json({
			location: await service.create(req.user.id, req.body),
		});
	},

	update: async (req, res) => {
		res.status(200).json({
			location: await service.update(
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
};