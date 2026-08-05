const service = require('./alerts.service');
const pushService = require('./push.service');

module.exports = {
	listRules: async (req, res) => {
		res.status(200).json(await service.listRules(req.user.id, req.query));
	},

	getRule: async (req, res) => {
		res.status(200).json({
			rule: await service.getRule(req.user.id, Number(req.params.id)),
		});
	},

	createRule: async (req, res) => {
		res.status(201).json({
			rule: await service.createRule(req.user.id, req.body),
		});
	},

	updateRule: async (req, res) => {
		res.status(200).json({
			rule: await service.updateRule(
				req.user.id,
				Number(req.params.id),
				req.body
			),
		});
	},

	deleteRule: async (req, res) => {
		await service.deleteRule(req.user.id, Number(req.params.id));
		res.status(204).send();
	},

	listEvents: async (req, res) => {
		res.status(200).json(await service.listEvents(req.user.id, req.query));
	},

	markEventRead: async (req, res) => {
		await service.markEventRead(req.user.id, Number(req.params.id));
		res.status(204).send();
	},

	markAllEventsRead: async (req, res) => {
		res.status(200).json(await service.markAllEventsRead(req.user.id));
	},
	subscribePush: async (req, res) => {
		res.status(201).json({
			subscription: await pushService.subscribe(req.user.id, req.body),
		});
	},

	listPush: async (req, res) => {
		res.status(200).json({
			subscriptions: await pushService.list(req.user.id),
		});
	},

	unsubscribePush: async (req, res) => {
		await pushService.unsubscribe(req.user.id, Number(req.params.id));
		res.status(204).send();
	},
};