const { WebSocketServer } = require('ws');
const config = require('../shared/config');
const logger = require('../shared/logger');
const { verifyAccessToken } = require('../modules/auth/auth.tokens');
const hub = require('./hub');

const PATH = '/ws/notifications';

const reject = (socket, status, text) => {
	socket.write(`HTTP/1.1 ${status} ${text}\r\nConnection: close\r\n\r\n`);
	socket.destroy();
};

const originAllowed = (origin) => {
	if (config.realtime.allowedOrigins.length === 0) return true;
	if (!origin) return false;
	return config.realtime.allowedOrigins.includes(origin);
};

const extractToken = (header) => {
	const parts = String(header ?? '')
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean);

	const index = parts.indexOf('bearer');
	return index === -1 ? null : (parts[index + 1] ?? null);
};

function attachRealtime(httpServer) {
	const wss = new WebSocketServer({
		noServer: true,
		maxPayload: 4096,
		handleProtocols: (protocols) => (protocols.has('bearer') ? 'bearer' : false),
	});

	httpServer.on('upgrade', (req, socket, head) => {
		const { pathname } = new URL(req.url, 'http://placeholder');

		if (pathname !== PATH) return reject(socket, 404, 'Not Found');
		if (!originAllowed(req.headers.origin)) {
			return reject(socket, 403, 'Forbidden');
		}

		const token = extractToken(req.headers['sec-websocket-protocol']);
		if (!token) return reject(socket, 401, 'Unauthorized');

		let claims;
		try {
			claims = verifyAccessToken(token);
		} catch {
			return reject(socket, 401, 'Unauthorized');
		}

		const userId = Number(claims.sub);
		if (!Number.isInteger(userId)) return reject(socket, 401, 'Unauthorized');

		wss.handleUpgrade(req, socket, head, (ws) => {
			ws.userId = userId;
			ws.isAlive = true;

			hub.register(userId, ws);

			ws.on('pong', () => {
				ws.isAlive = true;
			});
			ws.on('close', () => hub.unregister(userId, ws));
			ws.on('error', (err) => {
				logger.warn({ err, userId }, 'websocket error');
				hub.unregister(userId, ws);
			});

			ws.send(JSON.stringify({ type: 'connected' }));
		});
	});

	const heartbeat = setInterval(() => {
		for (const ws of wss.clients) {
			if (!ws.isAlive) {
				ws.terminate();
				continue;
			}
			ws.isAlive = false;
			ws.ping();
		}
	}, config.realtime.heartbeatMs);

	heartbeat.unref();

	return {
		wss,
		close() {
			clearInterval(heartbeat);
			hub.closeAll();
			return new Promise((resolve) => wss.close(resolve));
		},
	};
}

module.exports = { attachRealtime, PATH };