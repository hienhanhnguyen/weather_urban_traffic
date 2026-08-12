const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');
const { sequelize, AlertEvent, GovReportSchedule } = require('../src/shared/models');
const { readOutbox, clearOutbox } = require('../src/shared/mailer');
const { runGovDue } = require('../src/jobs/report.worker');
const {
	dailySeries,
	metricBreakdown,
	responseStats,
	scenarioBreakdown,
} = require('../src/modules/govreports/gov.report');
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

const seedIncident = async (user, { at, areaId, ...overrides } = {}) => {
	const event = await AlertEvent.create({
		user_id: user.id,
		area_id: areaId ?? (await seedArea(user)),
		title: 'Rainfall alert',
		body: 'It is pouring.',
		severity: 'critical',
		metric: 'precip',
		value: 41,
		...overrides,
	});

	if (at !== undefined) {
		await sequelize.query(
			'UPDATE alert_event SET created_at = ? WHERE event_id = ?',
			{ replacements: [at, event.event_id] }
		);
	}

	return event;
};

const event = (overrides = {}) => ({
	severity: 'warning',
	status: 'pending',
	metric: 'temp',
	scenarioId: null,
	createdAt: '2026-03-10T08:00:00.000Z',
	handledAt: null,
	...overrides,
});

test.before(setupTestDatabase);
test.beforeEach(async () => {
	await truncateAll();
	clearOutbox();
});
test.after(closeTestDatabase);

test('dailySeries fills the quiet days between incidents', () => {
	const rows = dailySeries(
		[
			event({ createdAt: '2026-03-10T08:00:00.000Z', severity: 'critical' }),
			event({ createdAt: '2026-03-10T21:00:00.000Z', severity: 'info' }),
			event({ createdAt: '2026-03-12T05:00:00.000Z' }),
		],
		{ from: '2026-03-10T00:00:00.000Z', to: '2026-03-12T23:00:00.000Z' }
	);

	assert.deepEqual(
		rows.map((row) => [row.day, row.total]),
		[
			['2026-03-10', 2],
			['2026-03-11', 0],
			['2026-03-12', 1],
		]
	);

	assert.deepEqual(rows[0], {
		day: '2026-03-10',
		total: 2,
		info: 1,
		warning: 0,
		critical: 1,
	});
});

test('dailySeries buckets by the local day, not the UTC day', () => {
	const rows = dailySeries([event({ createdAt: '2026-03-10T23:30:00.000Z' })], {
		offsetMinutes: 420,
	});

	assert.deepEqual(
		rows.map((row) => row.day),
		['2026-03-11']
	);
});

test('dailySeries is empty when there is nothing to plot', () => {
	assert.deepEqual(dailySeries([]), []);
});

test('metricBreakdown keeps every known metric and folds the rest', () => {
	const rows = metricBreakdown([
		event({ metric: 'temp' }),
		event({ metric: 'temp' }),
		event({ metric: 'precip' }),
		event({ metric: null }),
	]);

	assert.deepEqual(rows, [
		{ metric: 'temp', count: 2 },
		{ metric: 'feelslike', count: 0 },
		{ metric: 'precip', count: 1 },
		{ metric: 'precipprob', count: 0 },
		{ metric: 'other', count: 1 },
	]);
});

test('responseStats averages only the incidents that carry a handled time', () => {
	const stats = responseStats([
		event({
			status: 'resolved',
			createdAt: '2026-03-10T08:00:00.000Z',
			handledAt: '2026-03-10T08:30:00.000Z',
		}),
		event({
			status: 'acknowledged',
			createdAt: '2026-03-10T08:00:00.000Z',
			handledAt: '2026-03-10T10:00:00.000Z',
		}),
		event({ status: 'resolved', handledAt: null }),
		event({ status: 'pending' }),
	]);

	assert.deepEqual(stats, {
		handled: 3,
		pending: 1,
		handledShare: 0.75,
		averageMinutes: 75,
		slowestMinutes: 120,
	});
});

test('responseStats survives an empty period', () => {
	assert.deepEqual(responseStats([]), {
		handled: 0,
		pending: 0,
		handledShare: 0,
		averageMinutes: null,
		slowestMinutes: null,
	});
});

test('scenarioBreakdown ranks plans and counts the uncovered incidents', () => {
	const result = scenarioBreakdown(
		[
			event({ scenarioId: 2 }),
			event({ scenarioId: 2 }),
			event({ scenarioId: 1 }),
			event({ scenarioId: null }),
		],
		[
			{ id: 1, name: 'Flood plan', status: 'active' },
			{ id: 2, name: 'Heat plan', status: 'active' },
			{ id: 3, name: 'Storm plan', status: 'draft' },
		]
	);

	assert.deepEqual(
		result.rows.map((row) => [row.name, row.activations]),
		[
			['Heat plan', 2],
			['Flood plan', 1],
			['Storm plan', 0],
		]
	);

	assert.equal(result.activated, 3);
	assert.equal(result.uncovered, 1);
});

test('the report is closed to an account without the admin role', async () => {
	const user = await createUser();

	await request(app).get('/api/gov/reports').set(user.auth).expect(403);
});

test('the report aggregates incidents across the managed areas', async () => {
	const user = await officer();
	const north = await seedArea(user, 'North ward', 105.8, 21.0);
	const south = await seedArea(user, 'South ward', 106.0, 20.8);

	await seedIncident(user, { areaId: north, severity: 'critical' });
	await seedIncident(user, {
		areaId: north,
		severity: 'warning',
		metric: 'temp',
		status: 'resolved',
		handled_at: new Date(),
	});
	await seedIncident(user, { areaId: south, severity: 'info' });

	const res = await request(app)
		.get('/api/gov/reports')
		.query({ timeframe: '7d' })
		.set(user.auth)
		.expect(200);

	assert.equal(res.body.summary.total, 3);
	assert.equal(res.body.summary.areasAffected, 2);
	assert.equal(res.body.summary.areasManaged, 2);
	assert.deepEqual(res.body.summary.bySeverity, {
		info: 1,
		warning: 1,
		critical: 1,
	});

	assert.equal(res.body.response.pending, 2);
	assert.equal(res.body.response.handled, 1);
	assert.equal(res.body.areas[0].name, 'North ward');
	assert.equal(res.body.areas[0].total, 2);
	assert.equal(res.body.recent.length, 3);
	assert.equal(res.body.truncated, false);
});

test('the report window drops incidents older than the timeframe', async () => {
	const user = await officer();
	const areaId = await seedArea(user);

	await seedIncident(user, { areaId });
	await seedIncident(user, { areaId, at: '2026-01-01T00:00:00.000Z' });

	const recent = await request(app)
		.get('/api/gov/reports')
		.query({ timeframe: '24h' })
		.set(user.auth)
		.expect(200);

	assert.equal(recent.body.summary.total, 1);

	const everything = await request(app)
		.get('/api/gov/reports')
		.query({ timeframe: 'all' })
		.set(user.auth)
		.expect(200);

	assert.equal(everything.body.summary.total, 2);
});

test('the report can be narrowed to a single area', async () => {
	const user = await officer();
	const north = await seedArea(user, 'North ward', 105.8, 21.0);
	const south = await seedArea(user, 'South ward', 106.0, 20.8);

	await seedIncident(user, { areaId: north });
	await seedIncident(user, { areaId: south });

	const res = await request(app)
		.get('/api/gov/reports')
		.query({ area_id: south })
		.set(user.auth)
		.expect(200);

	assert.equal(res.body.summary.total, 1);
	assert.equal(res.body.range.areaId, south);
	assert.equal(res.body.recent[0].areaName, 'South ward');
});

test('one officer never sees another officer incidents', async () => {
	const mine = await officer();
	const theirs = await officer();

	await seedIncident(theirs);

	const res = await request(app)
		.get('/api/gov/reports')
		.set(mine.auth)
		.expect(200);

	assert.equal(res.body.summary.total, 0);
	assert.equal(res.body.summary.areasManaged, 0);
	assert.deepEqual(res.body.recent, []);
});

test('the report counts how many incidents ran under a plan', async () => {
	const user = await officer();
	const areaId = await seedArea(user);

	const plan = await request(app)
		.post('/api/gov/scenarios')
		.set(user.auth)
		.send({
			name: 'Heavy rain plan',
			metric: 'precip',
			min_severity: 'warning',
			steps: [{ content: 'Open the pumps', priority: 'high' }],
		})
		.expect(201);

	const covered = await seedIncident(user, { areaId });
	await seedIncident(user, { areaId });

	await request(app)
		.patch(`/api/gov/incidents/${covered.event_id}/scenario`)
		.set(user.auth)
		.send({ scenario_id: plan.body.scenario.id })
		.expect(200);

	const res = await request(app)
		.get('/api/gov/reports')
		.set(user.auth)
		.expect(200);

	assert.equal(res.body.scenarios.activated, 1);
	assert.equal(res.body.scenarios.uncovered, 1);
	assert.deepEqual(
		res.body.scenarios.rows.map((row) => [row.name, row.activations]),
		[['Heavy rain plan', 1]]
	);
});

test('a mailed report always goes to the caller, never to a named address', async () => {
	const user = await officer();
	await seedIncident(user);

	const res = await request(app)
		.post('/api/gov/reports/email')
		.set(user.auth)
		.send({ timeframe: '7d', email: 'attacker@example.com' })
		.expect(202);

	assert.equal(res.body.sentTo, user.email);

	const outbox = readOutbox();
	assert.equal(outbox.length, 1);
	assert.equal(outbox[0].to, user.email);
	assert.match(outbox[0].subject, /1 incidents/);
});

test('a mailed report carries only the requested topics', async () => {
	const user = await officer();
	await seedIncident(user);

	await request(app)
		.post('/api/gov/reports/email')
		.set(user.auth)
		.send({ topics: ['areas'] })
		.expect(202);

	const [mail] = readOutbox();

	assert.match(mail.text, /Areas/);
	assert.doesNotMatch(mail.text, /Response plans/);
});

test('an unknown topic is rejected', async () => {
	const user = await officer();

	await request(app)
		.post('/api/gov/reports/email')
		.set(user.auth)
		.send({ topics: ['payroll'] })
		.expect(400);

	assert.equal(readOutbox().length, 0);
});

test('a weekly schedule is stored with the next run already computed', async () => {
	const user = await officer();

	const empty = await request(app)
		.get('/api/gov/reports/schedule')
		.set(user.auth)
		.expect(200);

	assert.equal(empty.body.schedule, null);

	const res = await request(app)
		.put('/api/gov/reports/schedule')
		.set(user.auth)
		.send({
			range: '7d',
			topics: ['areas', 'incidents'],
			frequency: 'weekly',
			weekday: 1,
			hour: 8,
		})
		.expect(200);

	const { schedule } = res.body;

	assert.deepEqual(schedule.topics, ['areas', 'incidents']);
	assert.equal(schedule.weekday, 1);
	assert.equal(schedule.dayOfMonth, null);
	assert.equal(schedule.lastSentAt, null);

	const next = new Date(schedule.nextRunAt);

	assert.ok(next.getTime() > Date.now(), 'the next run should be in the future');
	assert.equal(next.getUTCDay(), 1);
	assert.equal(next.getUTCHours(), 8);
});

test('saving twice replaces the single schedule rather than adding one', async () => {
	const user = await officer();

	const body = { frequency: 'monthly', day_of_month: 3, hour: 6 };

	const first = await request(app)
		.put('/api/gov/reports/schedule')
		.set(user.auth)
		.send(body)
		.expect(200);

	const second = await request(app)
		.put('/api/gov/reports/schedule')
		.set(user.auth)
		.send({ ...body, hour: 9 })
		.expect(200);

	assert.equal(second.body.schedule.id, first.body.schedule.id);
	assert.equal(second.body.schedule.hour, 9);
	assert.equal(await GovReportSchedule.count(), 1);
});

test('a weekly schedule without a weekday is rejected', async () => {
	const user = await officer();

	await request(app)
		.put('/api/gov/reports/schedule')
		.set(user.auth)
		.send({ frequency: 'weekly', hour: 8 })
		.expect(400);

	assert.equal(await GovReportSchedule.count(), 0);
});

test('a schedule can be stopped once, and only once', async () => {
	const user = await officer();

	await request(app)
		.put('/api/gov/reports/schedule')
		.set(user.auth)
		.send({ frequency: 'weekly', weekday: 2 })
		.expect(200);

	await request(app)
		.delete('/api/gov/reports/schedule')
		.set(user.auth)
		.expect(204);

	await request(app)
		.delete('/api/gov/reports/schedule')
		.set(user.auth)
		.expect(404);
});

test('the worker delivers a due schedule and moves it on', async () => {
	const user = await officer();
	await seedIncident(user);

	await request(app)
		.put('/api/gov/reports/schedule')
		.set(user.auth)
		.send({ frequency: 'weekly', weekday: 1, hour: 7 })
		.expect(200);

	const schedule = await GovReportSchedule.findOne({
		where: { user_id: user.id },
	});

	const due = new Date(schedule.next_run_at);
	await schedule.update({ next_run_at: new Date(due.getTime() - 60_000) });

	const result = await runGovDue(due);

	assert.deepEqual(result, { due: 1, sent: 1, failed: 0 });

	const outbox = readOutbox();
	assert.equal(outbox.length, 1);
	assert.equal(outbox[0].to, user.email);

	await schedule.reload();

	assert.ok(
		new Date(schedule.next_run_at).getTime() > due.getTime(),
		'the schedule should have moved past the run it just did'
	);
	assert.ok(schedule.last_sent_at !== null);
});

test('the worker stops mailing once the admin role is gone', async () => {
	const user = await officer();

	await request(app)
		.put('/api/gov/reports/schedule')
		.set(user.auth)
		.send({ frequency: 'weekly', weekday: 1 })
		.expect(200);

	await sequelize.query('DELETE FROM user_role WHERE user_id = ?', {
		replacements: [user.id],
	});

	const schedule = await GovReportSchedule.findOne({
		where: { user_id: user.id },
	});

	const result = await runGovDue(new Date(schedule.next_run_at));

	assert.deepEqual(result, { due: 1, sent: 0, failed: 0 });
	assert.equal(readOutbox().length, 0);

	await schedule.reload();
	assert.equal(schedule.last_sent_at, null);
});
