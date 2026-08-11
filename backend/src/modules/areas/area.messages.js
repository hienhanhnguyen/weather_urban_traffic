const { METRIC_LABELS } = require('../alerts/alert.messages');
const { METRIC_UNIT } = require('./area.alert.rules');

const SENTENCE = {
	en: (label, value, unit, threshold, place) =>
		`${label} across ${place} is ${value}${unit}, at or above the ${threshold}${unit} you set.`,
	vi: (label, value, unit, threshold, place) =>
		`${label} tại ${place} đang là ${value}${unit}, đạt hoặc vượt ngưỡng ${threshold}${unit} đã đặt.`,
};

const TITLE = {
	en: (label, place) => `${label} alert: ${place}`,
	vi: (label, place) => `Cảnh báo ${label.toLowerCase()}: ${place}`,
};

function buildAreaMessage(rule, area, value, language = 'en') {
	const lang = METRIC_LABELS[language] ? language : 'en';

	const label = METRIC_LABELS[lang][rule.metric] ?? rule.metric;
	const place = area.name;
	const unit = METRIC_UNIT[rule.metric] ?? '';
	const shown = Number.isFinite(value) ? value.toFixed(1) : String(value);

	return {
		title: TITLE[lang](label, place),
		body: SENTENCE[lang](label, shown, unit, rule.threshold, place),
	};
}

module.exports = { buildAreaMessage };
