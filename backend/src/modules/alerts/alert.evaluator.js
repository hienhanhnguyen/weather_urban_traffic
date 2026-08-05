const { Op, literal } = require('sequelize');
const {
	AlertRule,
	AlertEvent,
	SavedLocation,
	User,
	UserPreference,
} = require('../../shared/models');
const weather = require('../weather/weather.service');
const hub = require('../../realtime/hub');
const push = require('../../realtime/push');
const logger = require('../../shared/logger');
const { sendMail } = require('../../shared/mailer');
const alertTemplate = require('../../shared/templates/alert');
const { buildMessage } = require('./alert.messages');

const SEVERITY_RANK = { info: 0, warning: 1, critical: 2 };

const DEFAULT_PREFERENCES = {
	language: 'en',
	min_severity: 'info',
	email_alerts_enabled: true,
	push_alerts_enabled: true,
};

const FORECAST_SLOTS_24H = 8; // the forecast endpoint is 3-hourly

const compare = (value, operator, threshold) => {
	switch (operator) {
		case '>':
			return value > threshold;
		case '>=':
			return value >= threshold;
		case '<':
			return value < threshold;
		case '<=':
			return value <= threshold;
		default:
			return false;
	}
};

const currentMetric = (metric, payload) => {
	const main = payload?.main ?? {};
	const rain = payload?.rain ?? {};

	switch (metric) {
		case 'temp':
			return typeof main.temp === 'number' ? main.temp : null;
		case 'feelslike':
			return typeof main.feels_like === 'number' ? main.feels_like : null;
		case 'precip':
			return Number(rain['1h'] ?? rain['3h'] ?? 0);
		case 'precipprob':
			return null; // not exposed by the current-weather endpoint
		default:
			return null;
	}
};

const forecastMetric = (metric, list, operator) => {
	const slots = Array.isArray(list) ? list.slice(0, FORECAST_SLOTS_24H) : [];

	const values = slots
		.map((slot) => {
			switch (metric) {
				case 'temp':
					return slot.main?.temp;
				case 'feelslike':
					return slot.main?.feels_like;
				case 'precip':
					return Number(slot.rain?.['3h'] ?? slot.rain?.['1h'] ?? 0);
				case 'precipprob':
					return typeof slot.pop === 'number' ? slot.pop * 100 : null;
				default:
					return null;
			}
		})
		.filter((value) => Number.isFinite(value));

	if (values.length === 0) return null;

	const reducer = operator === '>' || operator === '>=' ? Math.max : Math.min;
	return reducer(...values);
};

async function dueRules() {
	return AlertRule.findAll({
		where: {
			is_enabled: true,
			[Op.or]: [
				{ last_triggered_at: null },
				literal(
					`"AlertRule"."last_triggered_at" < now() - ("AlertRule"."cooldown_minutes" * interval '1 minute')`
				),
			],
		},
		include: [{ model: SavedLocation, as: 'location', required: true }],
	});
}

async function loadPreferences(userIds) {
	const rows = await UserPreference.findAll({
		where: { user_id: userIds },
	});

	const byUser = new Map(rows.map((row) => [row.user_id, row]));

	return (userId) => byUser.get(userId) ?? DEFAULT_PREFERENCES;
}

async function readMetric(rule) {
	const { latitude, longitude } = rule.location;

	if (rule.scope === 'current') {
		const payload = await weather.getCurrent({
			lat: latitude,
			lon: longitude,
			units: 'metric',
			lang: 'en',
		});
		return currentMetric(rule.metric, payload);
	}

	const payload = await weather.getForecast({
		lat: latitude,
		lon: longitude,
		units: 'metric',
		lang: 'en',
	});
	return forecastMetric(rule.metric, payload?.list, rule.operator);
}

async function deliver(rule, preference, message, value) {
	const payload = {
		type: 'alert',
		ruleId: rule.rule_id,
		locationId: rule.location_id,
		severity: rule.severity,
		metric: rule.metric,
		value,
		unit: rule.unit,
		...message,
		issuedAt: new Date().toISOString(),
	};

	const channels = [Promise.resolve(hub.sendToUser(rule.user_id, payload))];

	if (preference.push_alerts_enabled) {
		channels.push(push.sendToUser(rule.user_id, payload));
	}

	if (preference.email_alerts_enabled) {
		channels.push(
			User.findByPk(rule.user_id).then((user) =>
				user ? sendMail({ to: user.email, ...alertTemplate(message) }) : null
			)
		);
	}

	const results = await Promise.allSettled(channels);

	for (const result of results) {
		if (result.status === 'rejected') {
			logger.warn(
				{ err: result.reason, ruleId: rule.rule_id },
				'alert delivery failed on one channel'
			);
		}
	}
}

async function fire(rule, preference, value) {
	const message = buildMessage(rule, rule.location, value, preference.language);

	await AlertEvent.create({
		user_id: rule.user_id,
		rule_id: rule.rule_id,
		title: message.title,
		body: message.body,
		severity: rule.severity,
		metric: rule.metric,
		value,
	});

	await rule.update({ last_triggered_at: new Date(), last_value: value });

	await deliver(rule, preference, message, value);
}

async function evaluateAll() {
	const rules = await dueRules();
	if (rules.length === 0) return { evaluated: 0, fired: 0, failed: 0 };

	const preferenceFor = await loadPreferences([
		...new Set(rules.map((rule) => rule.user_id)),
	]);

	let fired = 0;
	let failed = 0;

	for (const rule of rules) {
		try {
			const preference = preferenceFor(rule.user_id);

			if (
				SEVERITY_RANK[rule.severity] < SEVERITY_RANK[preference.min_severity]
			) {
				continue;
			}

			const value = await readMetric(rule);
			if (value === null || !Number.isFinite(value)) continue;
			if (!compare(value, rule.operator, Number(rule.threshold))) continue;

			await fire(rule, preference, value);
			fired += 1;
		} catch (err) {
			failed += 1;
			logger.error(
				{ err, ruleId: rule.rule_id },
				'alert rule evaluation failed'
			);
		}
	}

	return { evaluated: rules.length, fired, failed };
}

module.exports = { evaluateAll, compare, currentMetric, forecastMetric };