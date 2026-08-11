const { Op } = require('sequelize');
const { AreaAlertRule, UserPreference } = require('../../shared/models');
const { ownedOrFail } = require('./areas.service');
const { METRIC_UNIT } = require('./area.alert.rules');
const { DEFAULT_PREFERENCES } = require('../alerts/delivery');
const evaluator = require('./area.evaluator');

const publicRule = (rule) => ({
	id: rule.rule_id,
	areaId: rule.area_id,
	metric: rule.metric,
	threshold: rule.threshold,
	unit: METRIC_UNIT[rule.metric],
	severity: rule.severity,
	cooldownMinutes: rule.cooldown_minutes,
	isEnabled: rule.is_enabled,
	lastTriggeredAt: rule.last_triggered_at,
	lastValue: rule.last_value,
});

const rulesOf = (areaId) =>
	AreaAlertRule.findAll({
		where: { area_id: areaId },
		order: [['metric', 'ASC']],
	});

async function listRules(userId, areaId) {
	await ownedOrFail(userId, areaId);

	return { rules: (await rulesOf(areaId)).map(publicRule) };
}

async function replaceRules(userId, areaId, incoming) {
	await ownedOrFail(userId, areaId);

	const keep = incoming.map((rule) => rule.metric);

	await AreaAlertRule.destroy({
		where: {
			area_id: areaId,
			...(keep.length > 0 ? { metric: { [Op.notIn]: keep } } : {}),
		},
	});

	for (const rule of incoming) {
		const existing = await AreaAlertRule.findOne({
			where: { area_id: areaId, metric: rule.metric },
		});

		if (existing) {
			await existing.update({
				threshold: rule.threshold,
				severity: rule.severity,
				cooldown_minutes: rule.cooldown_minutes,
				is_enabled: rule.is_enabled,
			});
		} else {
			await AreaAlertRule.create({ area_id: areaId, ...rule });
		}
	}

	return { rules: (await rulesOf(areaId)).map(publicRule) };
}

async function preferenceOf(userId) {
	const row = await UserPreference.findOne({ where: { user_id: userId } });

	return row ?? DEFAULT_PREFERENCES;
}

async function evaluateNow(userId, areaId, { force = false } = {}) {
	const area = await ownedOrFail(userId, areaId);
	const rules = await rulesOf(areaId);

	return evaluator.evaluateArea(area, rules, {
		preference: await preferenceOf(userId),
		force,
	});
}

module.exports = { listRules, replaceRules, evaluateNow, publicRule };
