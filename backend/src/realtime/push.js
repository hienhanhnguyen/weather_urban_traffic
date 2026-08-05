const webpush = require('web-push');
const config = require('../shared/config');
const logger = require('../shared/logger');
const { PushSubscription } = require('../shared/models');

let ready = false;

function initPush() {
	if (!config.push.enabled) {
		logger.info('web push disabled (PUSH_ENABLED=false)');
		return false;
	}

	webpush.setVapidDetails(
		config.push.subject,
		config.push.publicKey,
		config.push.privateKey
	);

	ready = true;
	logger.info('web push configured');
	return true;
}

async function sendToUser(userId, payload) {
	if (!ready) return { sent: 0, removed: 0 };

	const subscriptions = await PushSubscription.findAll({
		where: { user_id: userId },
	});

	if (subscriptions.length === 0) return { sent: 0, removed: 0 };

	const message = JSON.stringify(payload);
	let sent = 0;
	let removed = 0;

	await Promise.all(
		subscriptions.map(async (subscription) => {
			try {
				await webpush.sendNotification(
					{
						endpoint: subscription.endpoint,
						keys: {
							p256dh: subscription.p256dh,
							auth: subscription.auth,
						},
					},
					message
				);
				sent += 1;
				await subscription.update({ last_used_at: new Date() });
			} catch (err) {
				if (err.statusCode === 404 || err.statusCode === 410) {
					await subscription.destroy();
					removed += 1;
					return;
				}
				logger.warn(
					{ statusCode: err.statusCode, userId },
					'web push delivery failed'
				);
			}
		})
	);

	return { sent, removed };
}

module.exports = { initPush, sendToUser };