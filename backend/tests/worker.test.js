const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');
const { AlertRule, AlertEvent } = require('../src/shared/models');
const { cache } = require('../src/modules/weather/weather.service');
const { runAlertTick } = require('../src/jobs/alert.worker');
const {
	setupTestDatabase,
	truncateAll,
	closeTestDatabase,
} = require('./helpers/db');
const { createUser } = require('./helpers/auth');

const originalFetch = global.fetch;

const stubWeather = (temp) => {
	global.fetch = async () =>
		new Response(JSON.stringify({ main: { temp } }), {
			status: 200,
			headers: { 'content-type': 'application/json' },
		});
};

const seedRule = async (user, overrides = {}) => {
	const location = await request(app)
		.post('/api/locations')
		.set(user.auth)
		.send({ custom_name: 'Home', latitude: 21, longitude: 105.8 })
		.expect(201);

	const rule = await request(app)
		.post('/api/alerts/rules')
		.set(user.auth)
		.send({
			location_id: location.body.location.id,
			metric: 'temp',
			operator: '>',
			threshold: 35,
			...overrides,
		})
		.expect(201);

	return rule.body.rule.id;
};

test.before(setupTestDatabase);
test.beforeEach(async () => {
	await truncateAll();
	cache.clear();
});
test.afterEach(() => {
	global.fetch = originalFetch;
});
test.after(closeTestDatabase);

test('a rule whose threshold is crossed fires exactly once', async () => {
	const user = await createUser();
	const ruleId = await seedRule(user);
	stubWeather(38);

	await runAlertTick();

	const events = await AlertEvent.findAll({ where: { user_id: user.id } });
	assert.equal(events.length, 1);
	assert.match(events[0].title, /Temperature/);
	assert.equal(events[0].value, 38);

	const rule = await AlertRule.findByPk(ruleId);
	assert.notEqual(rule.last_triggered_at, null);
	assert.equal(rule.last_value, 38);
});

test('a rule inside its cooldown window does not fire again', async () => {
	const user = await createUser();
	const ruleId = await seedRule(user, { cooldown_minutes: 60 });
	stubWeather(38);

	await runAlertTick();
	await runAlertTick();

	const count = await AlertEvent.count({ where: { user_id: user.id } });
	assert.equal(count, 1);

	await AlertRule.update(
		{ last_triggered_at: new Date(Date.now() - 61 * 60_000) },
		{ where: { rule_id: ruleId } }
	);

	await runAlertTick();
	assert.equal(await AlertEvent.count({ where: { user_id: user.id } }), 2);
});

test('a rule below the user minimum severity is skipped', async () => {
	const user = await createUser();
	await seedRule(user, { severity: 'info' });

	await request(app)
		.put('/api/users/me/preferences')
		.set(user.auth)
		.send({ min_severity: 'critical' })
		.expect(200);

	stubWeather(38);
	await runAlertTick();

	assert.equal(await AlertEvent.count({ where: { user_id: user.id } }), 0);
});

test('a threshold that is not crossed produces nothing', async () => {
	const user = await createUser();
	await seedRule(user);
	stubWeather(20);

	await runAlertTick();

	assert.equal(await AlertEvent.count({ where: { user_id: user.id } }), 0);
});

test('two concurrent ticks fire the alert only once', async () => {
	const user = await createUser();
	await seedRule(user);
	stubWeather(38);

	await Promise.all([runAlertTick(), runAlertTick()]);

	assert.equal(await AlertEvent.count({ where: { user_id: user.id } }), 1);
});

test('one failing rule does not abort the tick', async () => {
	const first = await createUser();
	const second = await createUser();
	await seedRule(first);
	await seedRule(second);

	let call = 0;
	global.fetch = async () => {
		call += 1;
		if (call === 1) throw new Error('network down');
		return new Response(JSON.stringify({ main: { temp: 38 } }), {
			status: 200,
			headers: { 'content-type': 'application/json' },
		});
	};

	await runAlertTick();

	const total = await AlertEvent.count();
	assert.equal(total, 1);
});