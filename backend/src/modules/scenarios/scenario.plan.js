const METRICS = ['temp', 'feelslike', 'precip', 'precipprob'];
const SEVERITIES = ['info', 'warning', 'critical'];
const STATUSES = ['draft', 'active', 'archived'];
const PRIORITIES = ['high', 'medium', 'low'];

const MAX_STEPS = 20;

const SEVERITY_RANK = { info: 0, warning: 1, critical: 2 };

const numberSteps = (steps) =>
	steps.map((step, index) => ({
		position: index + 1,
		content: step.content.trim(),
		priority: step.priority,
	}));

function covers(scenario, incident) {
	if (scenario.status !== 'active') return false;
	if (scenario.metric !== null && scenario.metric !== incident.metric) {
		return false;
	}

	return (
		SEVERITY_RANK[incident.severity] >= SEVERITY_RANK[scenario.min_severity]
	);
}

module.exports = {
	METRICS,
	SEVERITIES,
	STATUSES,
	PRIORITIES,
	MAX_STEPS,
	SEVERITY_RANK,
	numberSteps,
	covers,
};
