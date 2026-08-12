const { Op, fn, col } = require('sequelize');
const {
	AlertEvent,
	ManagedArea,
	ResponseScenario,
	ResponseScenarioStep,
} = require('../../shared/models');
const { NotFoundError } = require('../../shared/errors');
const scenarios = require('../scenarios/scenarios.service');
const { rangeFor, summarise } = require('./incidents.report');

const publicIncident = (event) => ({
	id: event.event_id,
	areaId: event.area_id,
	areaName: event.managedArea ? event.managedArea.name : null,
	title: event.title,
	body: event.body,
	severity: event.severity,
	metric: event.metric,
	value: event.value,
	status: event.status,
	scenarioId: event.scenario_id,
	scenarioName: event.scenario ? event.scenario.name : null,
	activatedAt: event.activated_at,
	handledAt: event.handled_at,
	handledNote: event.handled_note,
	isRead: event.is_read,
	createdAt: event.createdAt,
});

function whereFor(userId, query) {
	const range = rangeFor(query);

	const where = {
		user_id: userId,
		area_id:
			query.area_id === undefined
				? { [Op.ne]: null }
				: query.area_id,
	};

	if (query.severity !== undefined) where.severity = query.severity;
	if (query.status !== undefined) where.status = query.status;
	if (query.metric !== undefined) where.metric = query.metric;

	if (range.from !== undefined || range.to !== undefined) {
		where.created_at = {
			...(range.from !== undefined && { [Op.gte]: range.from }),
			...(range.to !== undefined && { [Op.lte]: range.to }),
		};
	}

	return where;
}

async function list(userId, query) {
	const { page, limit } = query;

	const { rows, count } = await AlertEvent.findAndCountAll({
		where: whereFor(userId, query),
		include: [
			{
				model: ManagedArea,
				as: 'managedArea',
				attributes: ['name'],
				required: false,
			},
			{
				model: ResponseScenario,
				as: 'scenario',
				attributes: ['scenario_id', 'name'],
				required: false,
			},
		],
		order: [['event_id', 'DESC']],
		limit,
		offset: (page - 1) * limit,
	});

	return {
		incidents: rows.map(publicIncident),
		pagination: { page, limit, total: count },
	};
}

async function summary(userId, query) {
	const [buckets, areas] = await Promise.all([
		AlertEvent.findAll({
			where: whereFor(userId, query),
			attributes: [
				'area_id',
				'severity',
				'status',
				[fn('COUNT', col('event_id')), 'count'],
				[fn('MAX', col('created_at')), 'last_at'],
			],
			group: ['area_id', 'severity', 'status'],
			raw: true,
		}),
		ManagedArea.findAll({
			where: { user_id: userId },
			attributes: ['area_id', 'name'],
			raw: true,
		}),
	]);

	return summarise(
		buckets.map((bucket) => ({
			areaId: bucket.area_id,
			severity: bucket.severity,
			status: bucket.status,
			count: Number(bucket.count),
			lastAt: bucket.last_at,
		})),
		areas.map((area) => ({ id: area.area_id, name: area.name }))
	);
}

async function ownedOrFail(userId, incidentId) {
	const event = await AlertEvent.findOne({
		where: {
			event_id: incidentId,
			user_id: userId,
			area_id: { [Op.ne]: null },
		},
		include: [
			{
				model: ManagedArea,
				as: 'managedArea',
				attributes: ['name'],
				required: false,
			},
			{
				model: ResponseScenario,
				as: 'scenario',
				required: false,
				include: [
					{
						model: ResponseScenarioStep,
						as: 'steps',
						required: false,
					},
				],
			},
		],
		order: [
			[
				{ model: ResponseScenario, as: 'scenario' },
				{ model: ResponseScenarioStep, as: 'steps' },
				'position',
				'ASC',
			],
		],
	});

	if (!event) throw new NotFoundError('Incident not found');

	return event;
}

async function get(userId, incidentId) {
	const event = await ownedOrFail(userId, incidentId);

	return {
		incident: publicIncident(event),
		scenario: event.scenario
			? scenarios.publicScenario(event.scenario)
			: null,
	};
}

async function updateStatus(userId, incidentId, { status, note }) {
	const event = await ownedOrFail(userId, incidentId);
	const handled = status !== 'pending';

	await event.update({
		status,
		handled_at: handled ? new Date() : null,
		handled_note: handled ? (note ?? event.handled_note) || null : null,
		is_read: true,
	});

	return publicIncident(event);
}

async function activateScenario(userId, incidentId, scenarioId) {
	const event = await ownedOrFail(userId, incidentId);

	if (scenarioId !== null) await scenarios.ownedOrFail(userId, scenarioId);

	await event.update({
		scenario_id: scenarioId,
		activated_at: scenarioId === null ? null : new Date(),
	});

	return get(userId, incidentId);
}

module.exports = {
	list,
	summary,
	get,
	updateStatus,
	activateScenario,
	publicIncident,
	whereFor,
};
