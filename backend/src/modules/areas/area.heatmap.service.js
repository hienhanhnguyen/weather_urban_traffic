const { ManagedArea, AreaAlertRule } = require('../../shared/models');
const weather = require('../weather/weather.service');
const logger = require('../../shared/logger');
const { publicArea } = require('./areas.service');
const { gridKey, metricStatus, riskOf, readingOf } = require('./area.heatmap');

function readerFor() {
	const inFlight = new Map();

	return (area) => {
		const key = gridKey(area);
		const pending = inFlight.get(key);

		if (pending) return pending;

		const read = weather
			.getCurrent({
				lat: area.center_latitude,
				lon: area.center_longitude,
				units: 'metric',
			})
			.catch((err) => {
				logger.warn({ err, areaId: area.area_id }, 'heatmap read failed');
				return null;
			});

		inFlight.set(key, read);

		return read;
	};
}

function rulesByArea(rules) {
	const byArea = new Map();

	for (const rule of rules) {
		const bucket = byArea.get(rule.area_id) ?? [];
		bucket.push(rule);
		byArea.set(rule.area_id, bucket);
	}

	return byArea;
}

async function heatmap(userId) {
	const areas = await ManagedArea.findAll({
		where: { user_id: userId },
		order: [['name', 'ASC']],
	});

	if (areas.length === 0) return { areas: [] };

	const rules = await AreaAlertRule.findAll({
		where: { area_id: areas.map((area) => area.area_id) },
		order: [['metric', 'ASC']],
	});

	const byArea = rulesByArea(rules);
	const read = readerFor();
	const readings = await Promise.all(areas.map(read));

	return {
		areas: areas.map((area, index) => {
			const current = readings[index];
			const metrics = (byArea.get(area.area_id) ?? []).map((rule) =>
				metricStatus(rule, current)
			);

			return {
				...publicArea(area),
				risk: riskOf(metrics, { hasReading: current !== null }),
				reading: readingOf(current),
				metrics,
			};
		}),
	};
}

module.exports = { heatmap };
