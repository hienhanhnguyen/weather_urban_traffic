const config = require('../shared/config');
const logger = require('../shared/logger');

const sockets = new Map();

function register(userId, ws) {
	let set = sockets.get(userId);
	if (!set) {
		set = new Set();
		sockets.set(userId, set);
	}

	while (set.size >= config.realtime.maxConnectionsPerUser) {
		const oldest = set.values().next().value;
		set.delete(oldest);
		oldest.close(1013, 'Too many connections');
	}

	set.add(ws);
}

function unregister(userId, ws) {
	const set = sockets.get(userId);
	if (!set) return;

	set.delete(ws);
	if (set.size === 0) sockets.delete(userId);
}

function sendToUser(userId, payload) {
	const set = sockets.get(Number(userId));
	if (!set || set.size === 0) return 0;

	const message = JSON.stringify(payload);
	let delivered = 0;

	for (const ws of set) {
		if (ws.readyState !== ws.OPEN) continue;
		try {
			ws.send(message);
			delivered += 1;
		} catch (err) {
			logger.warn({ err, userId }, 'websocket send failed');
		}
	}

	return delivered;
}

function closeAll(code = 1001, reason = 'Server shutting down') {
	for (const set of sockets.values()) {
		for (const ws of set) ws.close(code, reason);
	}
	sockets.clear();
}

const connectionCount = () => {
	let total = 0;
	for (const set of sockets.values()) total += set.size;
	return total;
};

module.exports = {
	register,
	unregister,
	sendToUser,
	closeAll,
	connectionCount,
};