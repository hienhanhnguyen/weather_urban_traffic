const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');
const { cache } = require('../src/modules/weather/weather.service');
const { ReportSchedule } = require('../src/shared/models');
const { readOutbox } = require('../src/shared/mailer');
const { runDue } = require('../src/jobs/report.worker');
const { computeNextRun } = require('../src/modules/business/business.schedule');
const {
	setupTestDatabase,
	truncateAll,
	closeTestDatabase,
} = require('./helpers/db');
const { createUser } = require('./helpers/auth');

const originalFetch = global.fetch;

const TRIP = {
	name: 'Depot run',
	start: { latitude: 21.028511, longitude: 105.804817, address: 'Hanoi' },
	end: { latitude: 20.844912, longitude: 106.688087, address: 'Hai Phong' },
	profile: 'driving',
	distance_m: 102_000,
	duration_s: 7_200,
};

const HOURS = 4;
const base = () => Math.floor(Date.now() / 1000) + 60;
const times = () =>
	Array.from({ length: HOURS }, (_, index) => base() + index * 3600);

const POINTS = {
	'21.03': {
		temperature_2m: [10, 20, 30, 40],
		precipitation: [0, 1, 2, 0],
		precipitation_probability: [10, 20, 30, 40],
		relative_humidity_2m: [50, 50, 50, 50],
		wind_speed_10m: [5, 10, 15, 20],
		weather_code: [0, 61, 3, 95],
	},
	'20.84': {
		temperature_2m: [20, 30, 40, 50],
		precipitation: [0, 0, 0, 0],
		precipitation_probability: [0, 0, 0, 100],
		relative_humidity_2m: [60, 60, 60, 60],
		wind_speed_10m: [1, 2, 3, 4],
		weather_code: [0, 0, 45, 0],
	},
};

const seriesPayload = (latitude) => ({
	latitude: Number(latitude),
	longitude: 105.8,
	timezone: 'Asia/Bangkok',
	utc_offset_seconds: 25_200,
	hourly: { time: times(), ...POINTS[latitude] },
});

const stubWeather = () => {
	global.fetch = async (url) => {
		const latitude = new URL(url).searchParams.get('latitude');
		assert.ok(POINTS[latitude], `unexpected latitude ${latitude}`);

		return new Response(JSON.stringify(seriesPayload(latitude)), {
			status: 200,
			headers: { 'content-type': 'application/json' },
		});
	};
};

const createBusinessUser = () =>
	createUser({ accountType: 'business' });

async function createRoute(user) {
	const res = await request(app)
		.post('/api/routes')
		.set(user.auth)
		.send(TRIP)
		.expect(201);

	return res.body.route.id;
}

test.before(setupTestDatabase);
test.beforeEach(async () => {
	await truncateAll();
	cache.clear();
	stubWeather();
});
test.afterEach(() => {
	global.fetch = originalFetch;
});
test.after(closeTestDatabase);

test('the business section is closed to other account types', async () => {
	const individual = await createUser();
	const routeId = await createRoute(individual);

	const res = await request(app)
		.get(`/api/business/report?route_id=${routeId}`)
		.set(individual.auth)
		.expect(403);

	assert.equal(res.body.error.code, 'WRONG_ACCOUNT_TYPE');
});

test('the report requires authentication', async () => {
	await request(app).get('/api/business/report?route_id=1').expect(401);
});

test('a report averages both ends of the route hour by hour', async () => {
	const user = await createBusinessUser();
	const routeId = await createRoute(user);

	const res = await request(app)
		.get(`/api/business/report?route_id=${routeId}&range=24h`)
		.set(user.auth)
		.expect(200);

	const { kpis, series, frequency, points, units } = res.body;

	assert.equal(points.length, 2);
	assert.equal(units.temp, '°C');

	assert.equal(kpis.hours, HOURS);
	assert.equal(kpis.avgTemp, 30);
	assert.equal(kpis.minTemp, 15);
	assert.equal(kpis.maxTemp, 45);
	assert.equal(kpis.totalPrecip, 1.5);
	assert.equal(kpis.maxPrecipProb, 100);
	assert.equal(kpis.avgHumidity, 55);
	assert.equal(kpis.avgWind, 7.5);
	assert.equal(kpis.maxWind, 12);
	assert.equal(kpis.wetHours, 2);
	assert.equal(kpis.disruptiveHours, 2);

	assert.equal(series.length, HOURS);
	assert.equal(series[1].temp, 25);
	assert.equal(series[1].precip, 0.5);

	const hoursOf = (group) =>
		frequency.find((entry) => entry.group === group).hours;

	assert.equal(hoursOf('thunder'), 1);
	assert.equal(hoursOf('rain'), 1);
	assert.equal(hoursOf('fog'), 1);
	assert.equal(hoursOf('clear'), 1);
	assert.equal(hoursOf('snow'), 0);
});

test('a week of hours is reported as days', async () => {
	const user = await createBusinessUser();
	const routeId = await createRoute(user);

	const res = await request(app)
		.get(`/api/business/report?route_id=${routeId}&range=7d`)
		.set(user.auth)
		.expect(200);

	assert.ok(res.body.series.length <= 2);
	assert.match(res.body.series[0].at, /^\d{4}-\d{2}-\d{2}$/);
	assert.equal(typeof res.body.series[0].tempMax, 'number');
});

test('a report cannot be built for somebody else\'s route', async () => {
	const owner = await createBusinessUser();
	const stranger = await createBusinessUser();
	const routeId = await createRoute(owner);

	await request(app)
		.get(`/api/business/report?route_id=${routeId}`)
		.set(stranger.auth)
		.expect(404);
});

test('a weekly schedule is stored with the next run already computed', async () => {
	const user = await createBusinessUser();
	const routeId = await createRoute(user);

	const res = await request(app)
		.put('/api/business/report-schedule')
		.set(user.auth)
		.send({ route_id: routeId, range: '7d', frequency: 'weekly', weekday: 1, hour: 7 })
		.expect(200);

	const { schedule } = res.body;
	assert.equal(schedule.frequency, 'weekly');
	assert.equal(schedule.weekday, 1);
	assert.equal(schedule.dayOfMonth, null);
	assert.equal(schedule.lastSentAt, null);

	const next = new Date(schedule.nextRunAt);
	assert.ok(next.getTime() > Date.now());
	assert.equal(next.getUTCDay(), 1);

	const read = await request(app)
		.get('/api/business/report-schedule')
		.set(user.auth)
		.expect(200);

	assert.equal(read.body.schedule.id, schedule.id);
});

test('saving again replaces the schedule instead of adding one', async () => {
	const user = await createBusinessUser();
	const routeId = await createRoute(user);

	const send = (body) =>
		request(app)
			.put('/api/business/report-schedule')
			.set(user.auth)
			.send({ route_id: routeId, ...body })
			.expect(200);

	const first = await send({ frequency: 'weekly', weekday: 1 });
	const second = await send({ frequency: 'monthly', day_of_month: 5, hour: 9 });

	assert.equal(second.body.schedule.id, first.body.schedule.id);
	assert.equal(second.body.schedule.weekday, null);
	assert.equal(second.body.schedule.dayOfMonth, 5);
	assert.equal(await ReportSchedule.count(), 1);
});

test('a frequency cannot carry the other frequency\'s field', async () => {
	const user = await createBusinessUser();
	const routeId = await createRoute(user);

	const send = (body) =>
		request(app)
			.put('/api/business/report-schedule')
			.set(user.auth)
			.send({ route_id: routeId, ...body })
			.expect(400);

	await send({ frequency: 'monthly', day_of_month: 5, weekday: 1 });
	await send({ frequency: 'weekly', weekday: 1, day_of_month: 5 });
	await send({ frequency: 'weekly' });
	// 29–31 do not exist in every month.
	await send({ frequency: 'monthly', day_of_month: 31 });
});

test('a schedule cannot point at somebody else\'s route', async () => {
	const owner = await createBusinessUser();
	const stranger = await createBusinessUser();
	const routeId = await createRoute(owner);

	await request(app)
		.put('/api/business/report-schedule')
		.set(stranger.auth)
		.send({ route_id: routeId, frequency: 'weekly', weekday: 1 })
		.expect(404);

	assert.equal(await ReportSchedule.count(), 0);
});

test('deleting a schedule is only possible once', async () => {
	const user = await createBusinessUser();
	const routeId = await createRoute(user);

	await request(app)
		.put('/api/business/report-schedule')
		.set(user.auth)
		.send({ route_id: routeId, frequency: 'weekly', weekday: 1 })
		.expect(200);

	await request(app)
		.delete('/api/business/report-schedule')
		.set(user.auth)
		.expect(204);

	await request(app)
		.delete('/api/business/report-schedule')
		.set(user.auth)
		.expect(404);
});

test('the worker mails a due schedule and moves it forward', async () => {
	const user = await createBusinessUser();
	const routeId = await createRoute(user);

	await request(app)
		.put('/api/business/report-schedule')
		.set(user.auth)
		.send({ route_id: routeId, frequency: 'weekly', weekday: 1, hour: 7 })
		.expect(200);

	const schedule = await ReportSchedule.findOne();
	const due = new Date(Date.now() - 60_000);
	await schedule.update({ next_run_at: due });

	const result = await runDue(new Date());

	assert.deepEqual(result, { due: 1, sent: 1, failed: 0 });

	const outbox = readOutbox();
	assert.equal(outbox.length, 1);
	assert.equal(outbox[0].to, user.email);
	assert.match(outbox[0].subject, /Depot run/);
	assert.match(outbox[0].text, /Hours with rain: 2 of 4/);

	await schedule.reload();
	assert.ok(new Date(schedule.next_run_at).getTime() > Date.now());
	assert.equal(new Date(schedule.next_run_at).getUTCDay(), 1);
	assert.ok(schedule.last_sent_at !== null);
});

test('a schedule that is not due yet is left alone', async () => {
	const user = await createBusinessUser();
	const routeId = await createRoute(user);

	await request(app)
		.put('/api/business/report-schedule')
		.set(user.auth)
		.send({ route_id: routeId, frequency: 'weekly', weekday: 1 })
		.expect(200);

	assert.deepEqual(await runDue(new Date()), { due: 0, sent: 0, failed: 0 });
	assert.equal(readOutbox().length, 0);
});

test('a schedule survives a failed send by moving on', async () => {
	const user = await createBusinessUser();
	const routeId = await createRoute(user);

	await request(app)
		.put('/api/business/report-schedule')
		.set(user.auth)
		.send({ route_id: routeId, frequency: 'weekly', weekday: 1 })
		.expect(200);

	const schedule = await ReportSchedule.findOne();
	await schedule.update({ next_run_at: new Date(Date.now() - 60_000) });

	global.fetch = async () =>
		new Response('{}', { status: 500, headers: { 'content-type': 'application/json' } });

	const result = await runDue(new Date());
	assert.deepEqual(result, { due: 1, sent: 0, failed: 1 });

	await schedule.reload();
	assert.ok(new Date(schedule.next_run_at).getTime() > Date.now());
	assert.equal(schedule.last_sent_at, null);
});

test('the schedule clock follows the user timezone', async () => {
	const at = computeNextRun(
		{ frequency: 'weekly', weekday: 1, hour: 7 },
		'Asia/Bangkok',
		new Date('2026-01-01T00:00:00Z')
	);

	assert.equal(at.toISOString(), '2026-01-05T00:00:00.000Z');
});
