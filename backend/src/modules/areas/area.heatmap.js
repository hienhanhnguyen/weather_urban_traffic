const { METRIC_UNIT, metricValue } = require('./area.alert.rules');

const RISK_NONE = 'none';
const RISK_UNKNOWN = 'unknown';
const RISK_CLEAR = 'clear';

const RISKS = [
	RISK_NONE,
	RISK_UNKNOWN,
	RISK_CLEAR,
	'info',
	'warning',
	'critical',
];

const RISK_RANK = { clear: 0, info: 1, warning: 2, critical: 3 };

const gridKey = (area) =>
	`${Number(area.center_latitude).toFixed(2)},${Number(area.center_longitude).toFixed(2)}`;

function metricStatus(rule, current) {
	const value = metricValue(rule.metric, current);
	const threshold = Number(rule.threshold);

	return {
		metric: rule.metric,
		unit: METRIC_UNIT[rule.metric],
		threshold,
		severity: rule.severity,
		isEnabled: rule.is_enabled,
		value,
		exceeded: value !== null && value >= threshold,
	};
}

function riskOf(metrics, { hasReading }) {
	const watched = metrics.filter((metric) => metric.isEnabled);

	if (watched.length === 0) return RISK_NONE;
	if (!hasReading) return RISK_UNKNOWN;

	let risk = RISK_CLEAR;

	for (const metric of watched) {
		if (metric.exceeded && RISK_RANK[metric.severity] > RISK_RANK[risk]) {
			risk = metric.severity;
		}
	}

	return risk;
}

const readingOf = (current) =>
	current === null
		? null
		: {
			observedAt: current.observedAt,
			isDay: current.isDay,
			weatherCode: current.weatherCode,
			temp: current.temp,
			feelsLike: current.feelsLike,
			humidity: current.humidity,
			precip: current.precip,
			precipProb: current.precipProb,
			windSpeed: current.windSpeed,
		};

module.exports = {
	RISKS,
	RISK_NONE,
	RISK_UNKNOWN,
	RISK_CLEAR,
	RISK_RANK,
	gridKey,
	metricStatus,
	riskOf,
	readingOf,
};
