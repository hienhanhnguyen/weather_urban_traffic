const service = require('./business.service');

module.exports = {
	getReport: async (req, res) => {
		res.status(200).json(await service.buildReport(req.user.id, req.query));
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
