const METRICS = ['temp', 'feelslike', 'precip', 'precipprob'];

const METRIC_FIELD = {
	temp: 'temp',
	feelslike: 'feelsLike',
	precip: 'precip',
	precipprob: 'precipProb',
};

const METRIC_UNIT = {
	temp: 'C',
	feelslike: 'C',
	precip: 'mm',
	precipprob: '%',
};

const METRIC_RANGE = {
	temp: { min: -30, max: 60 },
	feelslike: { min: -30, max: 60 },
	precip: { min: 0, max: 500 },
	precipprob: { min: 0, max: 100 },
};

const MINUTE_MS = 60_000;

const SKIP_DISABLED = 'disabled';
const SKIP_COOLDOWN = 'cooldown';
const SKIP_NO_DATA = 'no_data';
const SKIP_BELOW_THRESHOLD = 'below_threshold';

const metricValue = (metric, current) => {
	const field = METRIC_FIELD[metric];
	if (!field) return null;

	const value = current?.[field];
	return Number.isFinite(value) ? value : null;
};

function isDue(rule, now = new Date()) {
	if (!rule.last_triggered_at) return true;

	const elapsed = now.getTime() - new Date(rule.last_triggered_at).getTime();

	return elapsed >= rule.cooldown_minutes * MINUTE_MS;
}


function decide(rule, current, { now = new Date(), force = false } = {}) {
	if (!rule.is_enabled) {
		return { fired: false, reason: SKIP_DISABLED, value: null };
	}

	const value = metricValue(rule.metric, current);

	if (!force && !isDue(rule, now)) {
		return { fired: false, reason: SKIP_COOLDOWN, value };
	}

	if (value === null) {
		return { fired: false, reason: SKIP_NO_DATA, value: null };
	}

	if (value < Number(rule.threshold)) {
		return { fired: false, reason: SKIP_BELOW_THRESHOLD, value };
	}

	return { fired: true, value };
}

function report(rules, current, options = {}) {
	const fired = [];
	const skipped = [];

	for (const rule of rules) {
		const outcome = decide(rule, current, options);

		if (outcome.fired) {
			fired.push({
				metric: rule.metric,
				value: outcome.value,
				threshold: Number(rule.threshold),
				unit: METRIC_UNIT[rule.metric],
			});
		} else {
			skipped.push({
				metric: rule.metric,
				reason: outcome.reason,
				...(outcome.value === null ? {} : { value: outcome.value }),
			});
		}
	}

	return { fired, skipped };
}

module.exports = {
	METRICS,
	METRIC_FIELD,
	METRIC_UNIT,
	METRIC_RANGE,
	SKIP_DISABLED,
	SKIP_COOLDOWN,
	SKIP_NO_DATA,
	SKIP_BELOW_THRESHOLD,
	metricValue,
	isDue,
	decide,
	report,
};
