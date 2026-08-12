const { SEVERITIES } = require('../incidents/incidents.report');

const TOPICS = ['areas', 'incidents', 'scenarios'];
const METRICS = ['temp', 'feelslike', 'precip', 'precipprob'];
const RANGES = ['24h', '7d', '30d'];

const MAX_EVENTS = 5000;
const RECENT_LIMIT = 50;
const MAX_DAYS = 95;

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

const zeroed = (keys) => Object.fromEntries(keys.map((key) => [key, 0]));

const round3 = (value) => Math.round(value * 1000) / 1000;

const dayKey = (at, offsetMinutes = 0) =>
	new Date(new Date(at).getTime() + offsetMinutes * MINUTE_MS)
		.toISOString()
		.slice(0, 10);

const emptyDay = (day) => ({ day, total: 0, ...zeroed(SEVERITIES) });

function dailySeries(events, { from, to, offsetMinutes = 0 } = {}) {
	const byDay = new Map();

	for (const event of events) {
		const key = dayKey(event.createdAt, offsetMinutes);
		const row = byDay.get(key) ?? emptyDay(key);

		row.total += 1;
		row[event.severity] += 1;
		byDay.set(key, row);
	}

	const seen = [...byDay.keys()].sort();

	const first = from ? dayKey(from, offsetMinutes) : seen[0];
	const last = to ? dayKey(to, offsetMinutes) : seen[seen.length - 1];

	if (first === undefined || last === undefined) return [];

	const rows = [];
	const end = Date.parse(`${last}T00:00:00Z`);

	for (
		let at = Date.parse(`${first}T00:00:00Z`);
		at <= end && rows.length < MAX_DAYS;
		at += DAY_MS
	) {
		const key = new Date(at).toISOString().slice(0, 10);
		rows.push(byDay.get(key) ?? emptyDay(key));
	}

	return rows;
}

function metricBreakdown(events) {
	const counts = new Map(METRICS.map((metric) => [metric, 0]));
	let other = 0;

	for (const event of events) {
		if (counts.has(event.metric)) {
			counts.set(event.metric, counts.get(event.metric) + 1);
		} else {
			other += 1;
		}
	}

	const rows = METRICS.map((metric) => ({ metric, count: counts.get(metric) }));

	if (other > 0) rows.push({ metric: 'other', count: other });

	return rows;
}

function responseStats(events) {
	let handled = 0;
	let pending = 0;
	let measured = 0;
	let totalMinutes = 0;
	let slowestMinutes = null;

	for (const event of events) {
		if (event.status === 'pending') {
			pending += 1;
			continue;
		}

		handled += 1;

		if (!event.handledAt) continue;

		const minutes = Math.max(
			0,
			Math.round(
				(Date.parse(event.handledAt) - Date.parse(event.createdAt)) / MINUTE_MS
			)
		);

		measured += 1;
		totalMinutes += minutes;

		if (slowestMinutes === null || minutes > slowestMinutes) {
			slowestMinutes = minutes;
		}
	}

	return {
		handled,
		pending,
		handledShare: events.length === 0 ? 0 : round3(handled / events.length),
		averageMinutes: measured === 0 ? null : Math.round(totalMinutes / measured),
		slowestMinutes,
	};
}

function scenarioBreakdown(events, scenarios) {
	const byId = new Map(
		scenarios.map((scenario) => [
			scenario.id,
			{
				scenarioId: scenario.id,
				name: scenario.name,
				status: scenario.status,
				activations: 0,
			},
		])
	);

	let activated = 0;

	for (const event of events) {
		const row = event.scenarioId === null ? null : byId.get(event.scenarioId);

		if (!row) continue;

		row.activations += 1;
		activated += 1;
	}

	const rows = [...byId.values()].sort(
		(a, b) => b.activations - a.activations || a.name.localeCompare(b.name)
	);

	return {
		rows,
		activated,
		uncovered: events.length - activated,
	};
}

const hasTopic = (topics, topic) => topics.includes(topic);

module.exports = {
	TOPICS,
	METRICS,
	RANGES,
	MAX_EVENTS,
	RECENT_LIMIT,
	MAX_DAYS,
	dayKey,
	dailySeries,
	metricBreakdown,
	responseStats,
	scenarioBreakdown,
	hasTopic,
};
