const MAX_SCORE = 100;

const LADDERS = [
	{
		key: 'rain',
		metric: 'precip',
		direction: 'above',
		// mm in an hour: light/moderate/heavy
		steps: [
			{ threshold: 7.6, points: 35 },
			{ threshold: 2.5, points: 22 },
			{ threshold: 0.5, points: 10 },
		],
	},
	{
		key: 'rainChance',
		metric: 'precipProb',
		direction: 'above',
		steps: [
			{ threshold: 80, points: 10 },
			{ threshold: 60, points: 6 },
			{ threshold: 40, points: 3 },
		],
	},
	{
		key: 'wind',
		metric: 'wind',
		direction: 'above',
		steps: [
			{ threshold: 62, points: 30 },
			{ threshold: 39, points: 18 },
			{ threshold: 20, points: 8 },
		],
	},
	{
		key: 'heat',
		metric: 'temp',
		direction: 'above',
		steps: [
			{ threshold: 38, points: 12 },
			{ threshold: 35, points: 6 },
		],
	},
	{
		key: 'cold',
		metric: 'temp',
		direction: 'below',
		steps: [
			{ threshold: 0, points: 12 },
			{ threshold: 5, points: 5 },
		],
	},
];

const CODE_RULES = [
	{ key: 'thunderstorm', codes: [95, 96, 99], points: 30 },
	{ key: 'snow', codes: [71, 73, 75, 77, 85, 86], points: 25 },
	{ key: 'freezing', codes: [56, 57, 66, 67], points: 25 },
	{ key: 'fog', codes: [45, 48], points: 15 },
];

const BANDS = [
	{ band: 'severe', from: 60 },
	{ band: 'high', from: 35 },
	{ band: 'moderate', from: 15 },
	{ band: 'low', from: 0 },
];

const RULE_ADVICE = {
	rain: 'slipperyRoad',
	rainChance: 'carryRainGear',
	wind: 'highSidedVehicles',
	heat: 'heatStress',
	cold: 'coldStress',
	thunderstorm: 'shelterFromLightning',
	snow: 'icyRoad',
	freezing: 'icyRoad',
	fog: 'reducedVisibility',
};

const BAND_ADVICE = {
	severe: 'postpone',
	high: 'postpone',
	moderate: 'allowExtraTime',
	low: 'goAsPlanned',
};

const bandFor = (score) => BANDS.find((entry) => score >= entry.from).band;

function ladderHit(ladder, row) {
	const value = row[ladder.metric];
	if (value === null || value === undefined) return null;

	const step = ladder.steps.find((entry) =>
		ladder.direction === 'above'
			? value >= entry.threshold
			: value <= entry.threshold
	);

	if (!step) return null;

	return {
		key: ladder.key,
		metric: ladder.metric,
		value,
		threshold: step.threshold,
		points: step.points,
	};
}

function codeHit(rule, row) {
	if (!rule.codes.includes(row.weatherCode)) return null;

	return {
		key: rule.key,
		metric: 'weatherCode',
		value: row.weatherCode,
		threshold: null,
		points: rule.points,
	};
}

function assessHour(row) {
	const fired = [
		...LADDERS.map((ladder) => ladderHit(ladder, row)),
		...CODE_RULES.map((rule) => codeHit(rule, row)),
	]
		.filter(Boolean)
		.sort((a, b) => b.points - a.points);

	const raw = fired.reduce((sum, rule) => sum + rule.points, 0);
	const score = Math.min(raw, MAX_SCORE);

	return { score, band: bandFor(score), rules: fired };
}

function adviceFor(band, rules) {
	const keys = [
		BAND_ADVICE[band],
		...rules.map((rule) => RULE_ADVICE[rule.key]).filter(Boolean),
	];

	return [...new Set(keys)];
}

module.exports = {
	MAX_SCORE,
	LADDERS,
	CODE_RULES,
	BANDS,
	assessHour,
	adviceFor,
	bandFor,
};
