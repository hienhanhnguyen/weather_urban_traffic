const RANGE_LABELS = {
	'24h': 'last 24 hours',
	'7d': 'last 7 days',
	'30d': 'last 30 days',
};

const METRIC_LABELS = {
	temp: 'Temperature',
	feelslike: 'Feels like',
	precip: 'Rainfall',
	precipprob: 'Rain chance',
	other: 'Other',
};

const duration = (minutes) => {
	if (minutes === null) return '—';
	if (minutes < 60) return `${minutes} min`;

	return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

const escapeHtml = (value) =>
	String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');

const section = (title, rows) => ({ title, rows });

function sectionsFor(report, topics) {
	const sections = [
		section('Overview', [
			['Incidents', String(report.summary.total)],
			['Critical', String(report.summary.bySeverity.critical)],
			['Warning', String(report.summary.bySeverity.warning)],
			['Info', String(report.summary.bySeverity.info)],
			['Still pending', String(report.response.pending)],
			['Average response', duration(report.response.averageMinutes)],
		]),
	];

	if (topics.includes('areas')) {
		sections.push(
			section(
				'Areas',
				report.areas
					.slice(0, 10)
					.map((area) => [area.name, `${area.total} (${area.pending} pending)`])
			)
		);
	}

	if (topics.includes('incidents')) {
		sections.push(
			section(
				'By measurement',
				report.metrics.map((row) => [
					METRIC_LABELS[row.metric] ?? row.metric,
					String(row.count),
				])
			)
		);
	}

	if (topics.includes('scenarios')) {
		sections.push(
			section('Response plans', [
				['Incidents with a plan', String(report.scenarios.activated)],
				['Incidents without a plan', String(report.scenarios.uncovered)],
				...report.scenarios.rows
					.filter((row) => row.activations > 0)
					.slice(0, 10)
					.map((row) => [row.name, String(row.activations)]),
			])
		);
	}

	return sections.filter((entry) => entry.rows.length > 0);
}

module.exports = function govReportTemplate({ report, topics }) {
	const window = RANGE_LABELS[report.range.timeframe] ?? 'selected period';
	const sections = sectionsFor(report, topics);

	const subject = `Area report: ${report.summary.total} incidents (${window})`;

	const text = sections
		.map(
			(entry) =>
				`${entry.title}\n` +
				entry.rows.map(([label, value]) => `  ${label}: ${value}`).join('\n')
		)
		.join('\n\n');

	const html = sections
		.map(
			(entry) =>
				`<h3>${escapeHtml(entry.title)}</h3>` +
				'<table cellpadding="6" style="border-collapse:collapse">' +
				entry.rows
					.map(
						([label, value]) =>
							`<tr><td style="opacity:.7">${escapeHtml(label)}</td>` +
							`<td><strong>${escapeHtml(value)}</strong></td></tr>`
					)
					.join('') +
				'</table>'
		)
		.join('');

	return {
		subject,
		text:
			`Managed areas — ${window}\n\n` +
			`${text}\n\nOpen the reports page for the full breakdown.`,
		html:
			`<p>Managed areas — ${escapeHtml(window)}.</p>` +
			html +
			'<p>Open the reports page for the full breakdown.</p>',
	};
};
