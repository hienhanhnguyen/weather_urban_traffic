const { Op, fn, col } = require('sequelize');
const {
	sequelize,
	AlertEvent,
	ResponseScenario,
	ResponseScenarioStep,
} = require('../../shared/models');
const { ConflictError, NotFoundError } = require('../../shared/errors');
const { numberSteps } = require('./scenario.plan');

const publicStep = (step) => ({
	id: step.step_id,
	position: step.position,
	content: step.content,
	priority: step.priority,
});

const publicScenario = (scenario, usageCount = 0) => ({
	id: scenario.scenario_id,
	name: scenario.name,
	description: scenario.description,
	metric: scenario.metric,
	minSeverity: scenario.min_severity,
	status: scenario.status,
	usageCount,
	steps: (scenario.steps ?? []).map(publicStep),
	createdAt: scenario.createdAt,
	updatedAt: scenario.updatedAt,
});

const withSteps = {
	model: ResponseScenarioStep,
	as: 'steps',
	required: false,
};

async function usageByScenario(scenarioIds) {
	if (scenarioIds.length === 0) return new Map();

	const rows = await AlertEvent.findAll({
		where: { scenario_id: scenarioIds },
		attributes: ['scenario_id', [fn('COUNT', col('event_id')), 'count']],
		group: ['scenario_id'],
		raw: true,
	});

	return new Map(rows.map((row) => [row.scenario_id, Number(row.count)]));
}

async function ownedOrFail(userId, scenarioId) {
	const scenario = await ResponseScenario.findOne({
		where: { scenario_id: scenarioId, user_id: userId },
		include: [withSteps],
		order: [[{ model: ResponseScenarioStep, as: 'steps' }, 'position', 'ASC']],
	});

	if (!scenario) throw new NotFoundError('Scenario not found');

	return scenario;
}

async function assertNameFree(userId, name, exceptId) {
	const clash = await ResponseScenario.findOne({
		where: { user_id: userId, name },
		attributes: ['scenario_id'],
	});

	if (clash && clash.scenario_id !== exceptId) {
		throw new ConflictError('You already have a scenario with that name', {
			code: 'SCENARIO_NAME_TAKEN',
		});
	}
}

async function list(userId, query = {}) {
	const where = { user_id: userId };

	if (query.status !== undefined) where.status = query.status;
	if (query.metric !== undefined) {
		where.metric = query.metric === 'any' ? null : query.metric;
	}
	if (query.q) where.name = { [Op.iLike]: `%${query.q}%` };

	const scenarios = await ResponseScenario.findAll({
		where,
		include: [withSteps],
		order: [
			['name', 'ASC'],
			[{ model: ResponseScenarioStep, as: 'steps' }, 'position', 'ASC'],
		],
	});

	const usage = await usageByScenario(
		scenarios.map((scenario) => scenario.scenario_id)
	);

	return {
		scenarios: scenarios.map((scenario) =>
			publicScenario(scenario, usage.get(scenario.scenario_id) ?? 0)
		),
	};
}

async function get(userId, scenarioId) {
	const scenario = await ownedOrFail(userId, scenarioId);
	const usage = await usageByScenario([scenario.scenario_id]);

	return publicScenario(scenario, usage.get(scenario.scenario_id) ?? 0);
}

async function create(userId, data) {
	await assertNameFree(userId, data.name);

	const scenarioId = await sequelize.transaction(async (transaction) => {
		const scenario = await ResponseScenario.create(
			{
				user_id: userId,
				name: data.name,
				description: data.description,
				metric: data.metric,
				min_severity: data.min_severity,
				status: data.status,
			},
			{ transaction }
		);

		await ResponseScenarioStep.bulkCreate(
			numberSteps(data.steps).map((step) => ({
				...step,
				scenario_id: scenario.scenario_id,
			})),
			{ transaction }
		);

		return scenario.scenario_id;
	});

	return get(userId, scenarioId);
}

async function update(userId, scenarioId, data) {
	const scenario = await ownedOrFail(userId, scenarioId);

	if (data.name !== undefined) {
		await assertNameFree(userId, data.name, scenario.scenario_id);
	}

	await sequelize.transaction(async (transaction) => {
		await scenario.update(
			{
				...(data.name !== undefined && { name: data.name }),
				...(data.description !== undefined && {
					description: data.description,
				}),
				...(data.metric !== undefined && { metric: data.metric }),
				...(data.min_severity !== undefined && {
					min_severity: data.min_severity,
				}),
				...(data.status !== undefined && { status: data.status }),
			},
			{ transaction }
		);

		if (data.steps !== undefined) {
			await ResponseScenarioStep.destroy({
				where: { scenario_id: scenario.scenario_id },
				transaction,
			});

			await ResponseScenarioStep.bulkCreate(
				numberSteps(data.steps).map((step) => ({
					...step,
					scenario_id: scenario.scenario_id,
				})),
				{ transaction }
			);
		}
	});

	return get(userId, scenario.scenario_id);
}

async function remove(userId, scenarioId) {
	const scenario = await ownedOrFail(userId, scenarioId);

	await scenario.destroy();
}

module.exports = {
	list,
	get,
	create,
	update,
	remove,
	publicScenario,
	ownedOrFail,
};
