const MINUTE_MS = 60 * 1000;

const TIMEFRAMES = {
	'24h': 24 * 60,
	'7d': 7 * 24 * 60,
	'30d': 30 * 24 * 60,
};

const SEVERITIES = ['info', 'warning', 'critical'];
const STATUSES = ['pending', 'acknowledged', 'resolved'];

const SEVERITY_RANK = { info: 0, warning: 1, critical: 2 };

function rangeFor({ timeframe, from, to } = {}, now = new Date()) {
	if (from !== undefined || to !== undefined) {
		return {
			...(from !== undefined && { from }),
			...(to !== undefined && { to }),
		};
	}

	const minutes = TIMEFRAMES[timeframe];

	if (minutes === undefined) return {};

	return { from: new Date(now.getTime() - minutes * MINUTE_MS) };
}

const zeroed = (keys) => Object.fromEntries(keys.map((key) => [key, 0]));

const worse = (a, b) => {
	if (a === null) return b;
	if (b === null) return a;
	return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
};

const later = (a, b) => {
	if (a === null) return b;
	if (b === null) return a;
	return a >= b ? a : b;
};

function summarise(buckets, areas) {
	const byArea = new Map(
		areas.map((area) => [
			area.id,
			{
				areaId: area.id,
				name: area.name,
				total: 0,
				pending: 0,
				worstSeverity: null,
				lastAt: null,
			},
		])
	);

	const summary = {
		total: 0,
		bySeverity: zeroed(SEVERITIES),
		byStatus: zeroed(STATUSES),
		areasAffected: 0,
	};

	for (const bucket of buckets) {
		const area = byArea.get(bucket.areaId);

		if (!area) continue;

		summary.total += bucket.count;
		summary.bySeverity[bucket.severity] += bucket.count;
		summary.byStatus[bucket.status] += bucket.count;

		area.total += bucket.count;
		if (bucket.status === 'pending') area.pending += bucket.count;
		area.worstSeverity = worse(area.worstSeverity, bucket.severity);
		area.lastAt = later(area.lastAt, bucket.lastAt);
	}

	const rows = [...byArea.values()];

	summary.areasAffected = rows.filter((area) => area.total > 0).length;

	rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

	return { ...summary, areas: rows };
}

module.exports = {
	MINUTE_MS,
	TIMEFRAMES,
	SEVERITIES,
	STATUSES,
	SEVERITY_RANK,
	rangeFor,
	summarise,
};
