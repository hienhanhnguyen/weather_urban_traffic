const { AreaAlertRule, ManagedArea, AlertEvent } = require('../../shared/models');
const weather = require('../weather/weather.service');
const logger = require('../../shared/logger');
const {
	SEVERITY_RANK,
	loadPreferences,
	deliver,
} = require('../alerts/delivery');
const { buildAreaMessage } = require('./area.messages');
const { METRIC_UNIT, report } = require('./area.alert.rules');

const readCentre = (area) =>
	weather.getCurrent({
		lat: area.center_latitude,
		lon: area.center_longitude,
		units: 'metric',
	});

const ruleOf = (rules, metric) => rules.find((rule) => rule.metric === metric);

function payloadOf(area, rule, message, value) {
	return {
		type: 'alert',
		ruleId: rule.rule_id,
		areaId: area.area_id,
		severity: rule.severity,
		metric: rule.metric,
		value,
		unit: METRIC_UNIT[rule.metric],
		...message,
		issuedAt: new Date().toISOString(),
	};
}

async function fire(area, rule, preference, value) {
	const message = buildAreaMessage(rule, area, value, preference.language);

	await AlertEvent.create({
		user_id: area.user_id,
		area_id: area.area_id,
		title: message.title,
		body: message.body,
		severity: rule.severity,
		metric: rule.metric,
		value,
	});

	await rule.update({ last_triggered_at: new Date(), last_value: value });

	await deliver({
		userId: area.user_id,
		preference,
		payload: payloadOf(area, rule, message, value),
		message,
		context: { areaId: area.area_id, ruleId: rule.rule_id },
	});
}

async function evaluateArea(area, rules, { preference, force = false } = {}) {
	if (rules.length === 0) return { fired: [], skipped: [] };

	const current = await readCentre(area);
	const outcome = report(rules, current, { force });

	for (const hit of outcome.fired) {
		const rule = ruleOf(rules, hit.metric);

		if (SEVERITY_RANK[rule.severity] < SEVERITY_RANK[preference.min_severity]) {
			continue;
		}

		await fire(area, rule, preference, hit.value);
	}

	return outcome;
}

async function evaluateAll() {
	const rules = await AreaAlertRule.findAll({
		where: { is_enabled: true },
		include: [{ model: ManagedArea, as: 'area', required: true }],
	});

	if (rules.length === 0) return { areas: 0, fired: 0, failed: 0 };

	const byArea = new Map();

	for (const rule of rules) {
		const bucket = byArea.get(rule.area_id) ?? { area: rule.area, rules: [] };
		bucket.rules.push(rule);
		byArea.set(rule.area_id, bucket);
	}

	const preferenceFor = await loadPreferences([
		...new Set([...byArea.values()].map((bucket) => bucket.area.user_id)),
	]);

	let fired = 0;
	let failed = 0;

	for (const { area, rules: areaRules } of byArea.values()) {
		try {
			const outcome = await evaluateArea(area, areaRules, {
				preference: preferenceFor(area.user_id),
			});
			fired += outcome.fired.length;
		} catch (err) {
			failed += 1;
			logger.error({ err, areaId: area.area_id }, 'area evaluation failed');
		}
	}

	return { areas: byArea.size, fired, failed };
}

module.exports = { evaluateArea, evaluateAll };
