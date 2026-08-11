const { AlertRule, AlertEvent, SavedLocation } = require('../../shared/models');
const { NotFoundError } = require('../../shared/errors');

const DEFAULT_UNIT_BY_METRIC = {
	temp: 'C',
	feelslike: 'C',
	precip: 'mm',
	precipprob: '%',
};

const publicRule = (rule) => ({
	id: rule.rule_id,
	locationId: rule.location_id,
	metric: rule.metric,
	operator: rule.operator,
	threshold: rule.threshold,
	unit: rule.unit,
	scope: rule.scope,
	severity: rule.severity,
	cooldownMinutes: rule.cooldown_minutes,
	isEnabled: rule.is_enabled,
	lastTriggeredAt: rule.last_triggered_at,
	lastValue: rule.last_value,
});

const publicEvent = (event) => ({
	id: event.event_id,
	ruleId: event.rule_id,
	title: event.title,
	body: event.body,
	severity: event.severity,
	metric: event.metric,
	value: event.value,
	isRead: event.is_read,
	createdAt: event.created_at,
});

async function assertOwnsLocation(userId, locationId) {
	const location = await SavedLocation.findOne({
		where: { location_id: locationId, user_id: userId },
	});
	if (!location) throw new NotFoundError('Location not found');
	return location;
}

async function ownedRuleOrFail(userId, ruleId) {
	const rule = await AlertRule.findOne({
		where: { rule_id: ruleId, user_id: userId },
	});
	if (!rule) throw new NotFoundError('Alert rule not found');
	return rule;
}

async function listRules(userId, { location_id, page, limit }) {
	const where = { user_id: userId };
	if (location_id !== undefined) where.location_id = location_id;

	const { rows, count } = await AlertRule.findAndCountAll({
		where,
		order: [['rule_id', 'ASC']],
		limit,
		offset: (page - 1) * limit,
	});

	return {
		rules: rows.map(publicRule),
		pagination: { page, limit, total: count },
	};
}

async function getRule(userId, ruleId) {
	return publicRule(await ownedRuleOrFail(userId, ruleId));
}

async function createRule(userId, data) {
	await assertOwnsLocation(userId, data.location_id);

	const rule = await AlertRule.create({
		...data,
		unit: data.unit ?? DEFAULT_UNIT_BY_METRIC[data.metric],
		user_id: userId,
	});

	return publicRule(rule);
}

async function updateRule(userId, ruleId, patch) {
	const rule = await ownedRuleOrFail(userId, ruleId);

	if (patch.location_id !== undefined) {
		await assertOwnsLocation(userId, patch.location_id);
	}

	const rederivedUnit =
		patch.metric !== undefined && patch.unit === undefined
			? { unit: DEFAULT_UNIT_BY_METRIC[patch.metric] }
			: null;

	await rule.update({ ...patch, ...rederivedUnit });
	return publicRule(rule);
}

async function deleteRule(userId, ruleId) {
	const rule = await ownedRuleOrFail(userId, ruleId);
	await rule.destroy();
}

async function listEvents(userId, { is_read, page, limit }) {
	const where = { user_id: userId };
	if (is_read !== undefined) where.is_read = is_read;

	const { rows, count } = await AlertEvent.findAndCountAll({
		where,
		order: [['event_id', 'DESC']],
		limit,
		offset: (page - 1) * limit,
	});

	return {
		events: rows.map(publicEvent),
		pagination: { page, limit, total: count },
	};
}

async function markEventRead(userId, eventId) {
	const [updated] = await AlertEvent.update(
		{ is_read: true },
		{ where: { event_id: eventId, user_id: userId } }
	);

	if (updated === 0) throw new NotFoundError('Alert event not found');
}

async function markAllEventsRead(userId) {
	const [updated] = await AlertEvent.update(
		{ is_read: true },
		{ where: { user_id: userId, is_read: false } }
	);

	return { updated };
}

module.exports = {
	listRules,
	getRule,
	createRule,
	updateRule,
	deleteRule,
	listEvents,
	markEventRead,
	markAllEventsRead,
};