const service = require('./users.service');

module.exports = {
	getMe: async (req, res) => {
		res.status(200).json({ user: await service.getProfile(req.user.id) });
	},

	updateMe: async (req, res) => {
		res.status(200).json({
			user: await service.updateProfile(req.user.id, req.body),
		});
	},

	getPreferences: async (req, res) => {
		res.status(200).json({
			preferences: await service.getPreferences(req.user.id),
		});
	},

	updatePreferences: async (req, res) => {
		res.status(200).json({
			preferences: await service.updatePreferences(req.user.id, req.body),
		});
	},

	listUsers: async (req, res) => {
		res.status(200).json(await service.listUsers(req.query));
	},

	setRoles: async (req, res) => {
		res.status(200).json({
			user: await service.setUserRoles(
				req.user.id,
				Number(req.params.id),
				req.body.roles
			),
		});
	},
};