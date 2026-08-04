const { User, Role, UserPreference } = require('../../shared/models');
const logger = require('../../shared/logger');
const {
	NotFoundError,
	ConflictError,
	ForbiddenError,
} = require('../../shared/errors');
const { publicUser } = require('./user.presenter');

const withRoles = {
	include: [{ model: Role, as: 'roles', through: { attributes: [] } }],
};

const roleNames = (user) => (user.roles ?? []).map((role) => role.name);

const publicPreferences = (preference) => ({
	language: preference.language,
	timezone: preference.timezone,
	emailAlertsEnabled: preference.email_alerts_enabled,
	pushAlertsEnabled: preference.push_alerts_enabled,
	minSeverity: preference.min_severity,
});

async function findUserOrFail(userId) {
	const user = await User.findByPk(userId, withRoles);
	if (!user) throw new NotFoundError('User not found');
	return user;
}

async function getProfile(userId) {
	const user = await findUserOrFail(userId);
	return publicUser(user, roleNames(user));
}

async function updateProfile(userId, patch) {
	const user = await findUserOrFail(userId);

	try {
		await user.update(patch);
	} catch (err) {
		if (err.name === 'SequelizeUniqueConstraintError') {
			throw new ConflictError('That username is already taken', {
				code: 'USERNAME_TAKEN',
			});
		}
		throw err;
	}

	return publicUser(user, roleNames(user));
}

async function getPreferences(userId) {
	const [preference] = await UserPreference.findOrCreate({
		where: { user_id: userId },
		defaults: { user_id: userId },
	});
	return publicPreferences(preference);
}

async function updatePreferences(userId, patch) {
	const [preference] = await UserPreference.findOrCreate({
		where: { user_id: userId },
		defaults: { user_id: userId },
	});
	await preference.update(patch);
	return publicPreferences(preference);
}

async function listUsers({ page, limit }) {
	const { rows, count } = await User.findAndCountAll({
		...withRoles,
		order: [['user_id', 'ASC']],
		limit,
		offset: (page - 1) * limit,
		distinct: true,
	});

	return {
		users: rows.map((user) => publicUser(user, roleNames(user))),
		pagination: {
			page,
			limit,
			total: count,
			pages: Math.ceil(count / limit),
		},
	};
}

async function setUserRoles(actorId, targetId, roleNamesRequested) {
	if (actorId === targetId) {
		throw new ForbiddenError('You cannot change your own roles', {
			code: 'SELF_ROLE_CHANGE',
		});
	}

	const target = await findUserOrFail(targetId);

	const roles = await Role.findAll({
		where: { name: roleNamesRequested },
	});

	if (roles.length !== roleNamesRequested.length) {
		throw new NotFoundError('One or more roles do not exist');
	}

	const previous = roleNames(target);
	await target.setRoles(roles);

	logger.warn(
		{
			actorId,
			targetId,
			previousRoles: previous,
			newRoles: roleNamesRequested,
		},
		'user roles changed'
	);

	const updated = await findUserOrFail(targetId);
	return publicUser(updated, roleNames(updated));
}

module.exports = {
	getProfile,
	updateProfile,
	getPreferences,
	updatePreferences,
	listUsers,
	setUserRoles,
};