const service = require('./business.service');

module.exports = {
	getReport: async (req, res) => {
		res.status(200).json(await service.buildReport(req.user.id, req.query));
	},

	emailReport: async (req, res) => {
		res.status(202).json(await service.emailReport(req.user.id, req.body));
	},

	getSchedule: async (req, res) => {
		res.status(200).json({ schedule: await service.getSchedule(req.user.id) });
	},

	saveSchedule: async (req, res) => {
		res.status(200).json({
			schedule: await service.saveSchedule(req.user.id, req.body),
		});
	},

	removeSchedule: async (req, res) => {
		await service.removeSchedule(req.user.id);
		res.status(204).send();
	},
};
