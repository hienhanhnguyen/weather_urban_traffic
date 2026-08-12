const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');
const { AlertEvent } = require('../src/shared/models');
const {
	numberSteps,
	covers,
} = require('../src/modules/scenarios/scenario.plan');
const {
	setupTestDatabase,
	truncateAll,
	closeTestDatabase,
} = require('./helpers/db');
const { createUser, promoteToAdmin } = require('./helpers/auth');

const officer = async () => promoteToAdmin(await createUser());

const polygon = (west, south) => ({
	type: 'Polygon',
	coordinates: [
		[
			[west, south],
			[west + 0.1, south],
			[west + 0.1, south + 0.1],
			[west, south + 0.1],
			[west, south],
		],
	],
});

const seedArea = async (user, name = 'Ba Dinh', west = 105.8, south = 21.0) => {
	const res = await request(app)
		.post('/api/gov/areas')
		.set(user.auth)
		.send({
			name,
			area_type: 'district',
			address: 'Ha Noi',
			boundary: polygon(west, south),
		})
		.expect(201);

	return res.body.area.id;
};

const step = (content, priority = 'medium') => ({ content, priority });

const seedScenario = async (user, overrides = {}) => {
	const res = await request(app)
		.post('/api/gov/scenarios')
		.set(user.auth)
		.send({
			name: 'Heavy rain plan',
			description: 'What to do when the rain will not stop.',
			metric: 'precip',
			min_severity: 'warning',
			steps: [step('Open the pumps', 'high'), step('Warn the wards')],
			...overrides,
		})
		.expect(201);

	return res.body.scenario;
};

const seedIncident = async (user, overrides = {}) =>
	AlertEvent.create({
		user_id: user.id,
		area_id: await seedArea(user),
		title: 'Rainfall alert',
		body: 'It is pouring.',
		severity: 'critical',
		metric: 'precip',
		value: 41,
		...overrides,
	});

test.before(setupTestDatabase);
test.beforeEach(truncateAll);
test.after(closeTestDatabase);

test('numberSteps renumbers a checklist from one with no holes', () => {
	const numbered = numberSteps([
		{ content: '  Sound the siren  ', priority: 'high' },
		{ content: 'Call the ward heads', priority: 'low' },
		{ content: 'Log the response', priority: 'medium' },
	]);

	assert.deepEqual(
		numbered.map((entry) => [entry.position, entry.content]),
		[
			[1, 'Sound the siren'],
			[2, 'Call the ward heads'],
			[3, 'Log the response'],
		]
	);
});

test('covers matches an incident on metric and severity floor', () => {
	const plan = {
		status: 'active',
		metric: 'precip',
		min_severity: 'warning',
	};

	assert.equal(covers(plan, { metric: 'precip', severity: 'critical' }), true);
	assert.equal(covers(plan, { metric: 'precip', severity: 'warning' }), true);
	assert.equal(covers(plan, { metric: 'precip', severity: 'info' }), false);
	assert.equal(covers(plan, { metric: 'temp', severity: 'critical' }), false);
});

test('covers treats a null metric as every metric', () => {
	const plan = { status: 'active', metric: null, min_severity: 'info' };

	assert.equal(covers(plan, { metric: 'temp', severity: 'info' }), true);
	assert.equal(covers(plan, { metric: 'precip', severity: 'info' }), true);
});

test('covers ignores a scenario that is not active', () => {
	for (const status of ['draft', 'archived']) {
		assert.equal(
			covers(
				{ status, metric: null, min_severity: 'info' },
				{ metric: 'temp', severity: 'critical' }
			),
			false
		);
	}
});

test('an officer creates a scenario with an ordered checklist', async () => {
	const user = await officer();

	const scenario = await seedScenario(user);

	assert.equal(scenario.name, 'Heavy rain plan');
	assert.equal(scenario.metric, 'precip');
	assert.equal(scenario.minSeverity, 'warning');
	assert.equal(scenario.status, 'active');
	assert.equal(scenario.usageCount, 0);
	assert.deepEqual(
		scenario.steps.map((entry) => [entry.position, entry.content, entry.priority]),
		[
			[1, 'Open the pumps', 'high'],
			[2, 'Warn the wards', 'medium'],
		]
	);
});

test('a scenario name cannot be reused by the same officer', async () => {
	const user = await officer();
	await seedScenario(user);

	const res = await request(app)
		.post('/api/gov/scenarios')
		.set(user.auth)
		.send({ name: 'Heavy rain plan' })
		.expect(409);

	assert.equal(res.body.error.code, 'SCENARIO_NAME_TAKEN');
});

test('the same name is free for a different officer', async () => {
	const [one, two] = await Promise.all([officer(), officer()]);

	await seedScenario(one);
	await seedScenario(two);

	const res = await request(app)
		.get('/api/gov/scenarios')
		.set(two.auth)
		.expect(200);

	assert.equal(res.body.scenarios.length, 1);
});

test('updating a scenario replaces its checklist whole', async () => {
	const user = await officer();
	const created = await seedScenario(user);

	const res = await request(app)
		.put(`/api/gov/scenarios/${created.id}`)
		.set(user.auth)
		.send({
			status: 'draft',
			steps: [step('Evacuate the riverside', 'high')],
		})
		.expect(200);

	assert.equal(res.body.scenario.status, 'draft');
	assert.equal(res.body.scenario.name, 'Heavy rain plan');
	assert.deepEqual(
		res.body.scenario.steps.map((entry) => [entry.position, entry.content]),
		[[1, 'Evacuate the riverside']]
	);
});

test('the list can be filtered by status, metric and name', async () => {
	const user = await officer();

	await seedScenario(user);
	await seedScenario(user, {
		name: 'Heatwave plan',
		metric: 'temp',
		status: 'archived',
		steps: [],
	});
	await seedScenario(user, { name: 'Anything plan', metric: null, steps: [] });

	const byStatus = await request(app)
		.get('/api/gov/scenarios?status=archived')
		.set(user.auth)
		.expect(200);
	assert.deepEqual(
		byStatus.body.scenarios.map((entry) => entry.name),
		['Heatwave plan']
	);

	const byMetric = await request(app)
		.get('/api/gov/scenarios?metric=any')
		.set(user.auth)
		.expect(200);
	assert.deepEqual(
		byMetric.body.scenarios.map((entry) => entry.name),
		['Anything plan']
	);

	const byName = await request(app)
		.get('/api/gov/scenarios?q=rain')
		.set(user.auth)
		.expect(200);
	assert.deepEqual(
		byName.body.scenarios.map((entry) => entry.name),
		['Heavy rain plan']
	);
});

test('one officer cannot read or delete another officer\'s scenario', async () => {
	const [mine, theirs] = await Promise.all([officer(), officer()]);
	const scenario = await seedScenario(mine);

	await request(app)
		.get(`/api/gov/scenarios/${scenario.id}`)
		.set(theirs.auth)
		.expect(404);

	await request(app)
		.delete(`/api/gov/scenarios/${scenario.id}`)
		.set(theirs.auth)
		.expect(404);
});

test('deleting a scenario takes its steps with it', async () => {
	const user = await officer();
	const scenario = await seedScenario(user);

	await request(app)
		.delete(`/api/gov/scenarios/${scenario.id}`)
		.set(user.auth)
		.expect(204);

	await request(app)
		.get(`/api/gov/scenarios/${scenario.id}`)
		.set(user.auth)
		.expect(404);
});

test('an officer activates a scenario on an incident', async () => {
	const user = await officer();
	const scenario = await seedScenario(user);
	const incident = await seedIncident(user);

	const res = await request(app)
		.patch(`/api/gov/incidents/${incident.event_id}/scenario`)
		.set(user.auth)
		.send({ scenario_id: scenario.id })
		.expect(200);

	assert.equal(res.body.incident.scenarioId, scenario.id);
	assert.equal(res.body.incident.scenarioName, 'Heavy rain plan');
	assert.ok(res.body.incident.activatedAt);
	assert.deepEqual(
		res.body.scenario.steps.map((entry) => entry.content),
		['Open the pumps', 'Warn the wards']
	);
});

test('reading the incident afterwards returns the plan and counts the use', async () => {
	const user = await officer();
	const scenario = await seedScenario(user);
	const incident = await seedIncident(user);

	await request(app)
		.patch(`/api/gov/incidents/${incident.event_id}/scenario`)
		.set(user.auth)
		.send({ scenario_id: scenario.id })
		.expect(200);

	const read = await request(app)
		.get(`/api/gov/incidents/${incident.event_id}`)
		.set(user.auth)
		.expect(200);
	assert.equal(read.body.scenario.id, scenario.id);
	assert.equal(read.body.scenario.steps.length, 2);

	const listed = await request(app)
		.get('/api/gov/scenarios')
		.set(user.auth)
		.expect(200);
	assert.equal(listed.body.scenarios[0].usageCount, 1);
});

test('clearing the scenario leaves the incident without a plan', async () => {
	const user = await officer();
	const scenario = await seedScenario(user);
	const incident = await seedIncident(user);

	await request(app)
		.patch(`/api/gov/incidents/${incident.event_id}/scenario`)
		.set(user.auth)
		.send({ scenario_id: scenario.id })
		.expect(200);

	const res = await request(app)
		.patch(`/api/gov/incidents/${incident.event_id}/scenario`)
		.set(user.auth)
		.send({ scenario_id: null })
		.expect(200);

	assert.equal(res.body.incident.scenarioId, null);
	assert.equal(res.body.incident.activatedAt, null);
	assert.equal(res.body.scenario, null);
});

test('a scenario belonging to another officer cannot be activated', async () => {
	const [mine, theirs] = await Promise.all([officer(), officer()]);
	const scenario = await seedScenario(theirs);
	const incident = await seedIncident(mine);

	await request(app)
		.patch(`/api/gov/incidents/${incident.event_id}/scenario`)
		.set(mine.auth)
		.send({ scenario_id: scenario.id })
		.expect(404);

	const read = await request(app)
		.get(`/api/gov/incidents/${incident.event_id}`)
		.set(mine.auth)
		.expect(200);
	assert.equal(read.body.incident.scenarioId, null);
});

test('deleting an activated scenario leaves the incident standing', async () => {
	const user = await officer();
	const scenario = await seedScenario(user);
	const incident = await seedIncident(user);

	await request(app)
		.patch(`/api/gov/incidents/${incident.event_id}/scenario`)
		.set(user.auth)
		.send({ scenario_id: scenario.id })
		.expect(200);

	await request(app)
		.delete(`/api/gov/scenarios/${scenario.id}`)
		.set(user.auth)
		.expect(204);

	const read = await request(app)
		.get(`/api/gov/incidents/${incident.event_id}`)
		.set(user.auth)
		.expect(200);
	assert.equal(read.body.incident.scenarioId, null);
	assert.equal(read.body.scenario, null);
});

test('a signed-in user without the admin role is refused', async () => {
	const plain = await createUser();

	await request(app).get('/api/gov/scenarios').set(plain.auth).expect(403);
	await request(app)
		.post('/api/gov/scenarios')
		.set(plain.auth)
		.send({ name: 'Sneaky plan' })
		.expect(403);
});

test('a checklist step is rejected when it is empty or too long', async () => {
	const user = await officer();

	await request(app)
		.post('/api/gov/scenarios')
		.set(user.auth)
		.send({ name: 'Blank step', steps: [step('   ')] })
		.expect(400);

	await request(app)
		.post('/api/gov/scenarios')
		.set(user.auth)
		.send({ name: 'Long step', steps: [step('x'.repeat(501))] })
		.expect(400);
});
