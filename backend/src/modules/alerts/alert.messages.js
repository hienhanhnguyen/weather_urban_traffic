const METRIC_LABELS = {
	en: {
		temp: 'Temperature',
		feelslike: 'Feels-like temperature',
		precip: 'Rainfall',
		precipprob: 'Chance of rain',
	},
	vi: {
		temp: 'Nhiệt độ',
		feelslike: 'Nhiệt độ cảm nhận',
		precip: 'Lượng mưa',
		precipprob: 'Xác suất mưa',
	},
};

const SENTENCE = {
	en: (label, value, unit, operator, threshold, place) =>
		`${label} at ${place} is ${value}${unit} (threshold ${operator} ${threshold}${unit}).`,
	vi: (label, value, unit, operator, threshold, place) =>
		`${label} tại ${place} đang là ${value}${unit} (vượt ngưỡng ${operator} ${threshold}${unit}).`,
};

const TITLE = {
	en: (label, place) => `${label} alert: ${place}`,
	vi: (label, place) => `Cảnh báo ${label.toLowerCase()}: ${place}`,
};

function buildMessage(rule, location, value, language = 'en') {
	const lang = METRIC_LABELS[language] ? language : 'en';

	const label = METRIC_LABELS[lang][rule.metric] ?? rule.metric;
	const place =
		location.custom_name || location.address || `Location #${location.location_id}`;
	const unit = rule.unit ?? '';
	const shown = Number.isFinite(value) ? value.toFixed(1) : String(value);

	return {
		title: TITLE[lang](label, place),
		body: SENTENCE[lang](label, shown, unit, rule.operator, rule.threshold, place),
	};
}

module.exports = { buildMessage, METRIC_LABELS };