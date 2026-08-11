const { PushSubscription } = require('../../shared/models');
const { NotFoundError } = require('../../shared/errors');

const publicSubscription = (subscription) => ({
	id: subscription.subscription_id,
	endpoint: subscription.endpoint,
	userAgent: subscription.user_agent,
	lastUsedAt: subscription.last_used_at,
	createdAt: subscription.createdAt,
});

async function subscribe(userId, { endpoint, keys, user_agent }) {
	const [subscription] = await PushSubscription.upsert(
		{
			user_id: userId,
			endpoint,
			p256dh: keys.p256dh,
			auth: keys.auth,
			user_agent: user_agent ?? null,
		},
		{ conflictFields: ['endpoint'] }
	);

	return publicSubscription(subscription);
}

async function list(userId) {
	const rows = await PushSubscription.findAll({
		where: { user_id: userId },
		order: [['subscription_id', 'ASC']],
	});
	return rows.map(publicSubscription);
}

async function unsubscribe(userId, subscriptionId) {
	const destroyed = await PushSubscription.destroy({
		where: { subscription_id: subscriptionId, user_id: userId },
	});

	if (destroyed === 0) throw new NotFoundError('Subscription not found');
}

module.exports = { subscribe, list, unsubscribe };
