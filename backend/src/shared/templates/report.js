const RANGE_LABELS = { '24h': 'next 24 hours', '7d': 'next 7 days' };

const show = (value, unit) => (value === null ? '—' : `${value}${unit}`);

module.exports = function reportTemplate({ report }) {
	const { route, kpis, units } = report;
	const window = RANGE_LABELS[report.range] ?? report.range;

	const lines = [
		['Average temperature', show(kpis.avgTemp, units.temp)],
		['Range', `${show(kpis.minTemp, units.temp)} to ${show(kpis.maxTemp, units.temp)}`],
		['Total rainfall', show(kpis.totalPrecip, units.precip)],
		['Hours with rain', `${kpis.wetHours} of ${kpis.hours}`],
		['Disruptive hours', `${kpis.disruptiveHours} of ${kpis.hours}`],
		['Average wind', show(kpis.avgWind, units.wind)],
		['Strongest wind', show(kpis.maxWind, units.wind)],
	];

	const subject = `Weather report: ${route.name} (${window})`;

	return {
		subject,
		text:
			`${route.name} — ${window}\n\n` +
			lines.map(([label, value]) => `${label}: ${value}`).join('\n') +
			'\n\nOpen the reports page for the full breakdown.',
		html:
			`<h3>${route.name}</h3>` +
			`<p>Outlook for the ${window}.</p>` +
			'<table cellpadding="6" style="border-collapse:collapse">' +
			lines
				.map(
					([label, value]) =>
						`<tr><td style="opacity:.7">${label}</td><td><strong>${value}</strong></td></tr>`
				)
				.join('') +
			'</table>' +
			'<p>Open the reports page for the full breakdown.</p>',
	};
};
