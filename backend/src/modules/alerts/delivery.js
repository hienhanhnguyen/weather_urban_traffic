const { User, UserPreference } = require('../../shared/models');
const hub = require('../../realtime/hub');
const push = require('../../realtime/push');
const logger = require('../../shared/logger');
const { sendMail } = require('../../shared/mailer');
const alertTemplate = require('../../shared/templates/alert');

const SEVERITY_RANK = { info: 0, warning: 1, critical: 2 };

const DEFAULT_PREFERENCES = {
	language: 'en',
	min_severity: 'info',
	email_alerts_enabled: true,
	push_alerts_enabled: true,
};

async function loadPreferences(userIds) {
	const rows = await UserPreference.findAll({ where: { user_id: userIds } });
	const byUser = new Map(rows.map((row) => [row.user_id, row]));

	return (userId) => byUser.get(userId) ?? DEFAULT_PREFERENCES;
}

const isMuted = (severity, preference) =>
	SEVERITY_RANK[severity] < SEVERITY_RANK[preference.min_severity];

async function deliver({ userId, preference, payload, message, context }) {
	const channels = [Promise.resolve(hub.sendToUser(userId, payload))];

	if (preference.push_alerts_enabled) {
		channels.push(push.sendToUser(userId, payload));
	}

	if (preference.email_alerts_enabled) {
		channels.push(
			User.findByPk(userId).then((user) =>
				user ? sendMail({ to: user.email, ...alertTemplate(message) }) : null
			)
		);
	}

	const results = await Promise.allSettled(channels);

	for (const result of results) {
		if (result.status === 'rejected') {
			logger.warn(
				{ err: result.reason, ...context },
				'alert delivery failed on one channel'
			);
		}
	}
}

module.exports = {
	SEVERITY_RANK,
	DEFAULT_PREFERENCES,
	loadPreferences,
	isMuted,
	deliver,
};
