const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const WebSocket = require('ws');

const app = require('../src/app');
const hub = require('../src/realtime/hub');
const { attachRealtime } = require('../src/realtime/attach');
const {
	setupTestDatabase,
	truncateAll,
	closeTestDatabase,
} = require('./helpers/db');
const { createUser } = require('./helpers/auth');

let server;
let realtime;
let baseUrl;

const connect = (token) =>
	new Promise((resolve, reject) => {
		const ws = new WebSocket(`${baseUrl}/ws/notifications`, [
			'bearer',
			token,
		]);
		ws.once('open', () => resolve(ws));
		ws.once('unexpected-response', (_req, res) =>
			reject(new Error(`HTTP ${res.statusCode}`))
		);
		ws.once('error', reject);
	});

const nextMessage = (ws) =>
	new Promise((resolve) => {
		ws.on('message', function handler(raw) {
			const parsed = JSON.parse(raw.toString());
			if (parsed.type === 'connected') return;
			ws.off('message', handler);
			resolve(parsed);
		});
	});

test.before(async () => {
	await setupTestDatabase();
	server = http.createServer(app);
	realtime = attachRealtime(server);
	await new Promise((resolve) => server.listen(0, resolve));
	baseUrl = `ws://127.0.0.1:${server.address().port}`;
});

test.beforeEach(truncateAll);

test.after(async () => {
	await realtime.close();
	await new Promise((resolve) => server.close(resolve));
	await closeTestDatabase();
});

test('an upgrade without a token is refused', async () => {
	await assert.rejects(
		() =>
			new Promise((resolve, reject) => {
				const ws = new WebSocket(`${baseUrl}/ws/notifications`);
				ws.once('open', () => resolve(ws));
				ws.once('unexpected-response', (_req, res) =>
					reject(new Error(`HTTP ${res.statusCode}`))
				);
				ws.once('error', reject);
			}),
		/401/
	);
});

test('an upgrade with a bad token is refused', async () => {
	await assert.rejects(() => connect('not-a-jwt'), /401/);
});

test('a message reaches only its addressee', async () => {
	const alice = await createUser();
	const bob = await createUser();

	const aliceWs = await connect(alice.accessToken);
	const bobWs = await connect(bob.accessToken);

	const received = nextMessage(aliceWs);

	let bobGotSomething = false;
	bobWs.on('message', (raw) => {
		if (JSON.parse(raw.toString()).type !== 'connected') {
			bobGotSomething = true;
		}
	});

	const delivered = hub.sendToUser(alice.id, {
		type: 'alert',
		title: 'Hot',
	});
	assert.equal(delivered, 1);

	const message = await received;
	assert.equal(message.title, 'Hot');
	assert.equal(bobGotSomething, false);

	aliceWs.close();
	bobWs.close();
});