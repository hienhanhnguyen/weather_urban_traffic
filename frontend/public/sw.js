/**
 * Service worker for web push.
 *
 * It lives in `public/` rather than being bundled so that it is served from
 * the origin root and therefore controls the whole site. It deliberately does
 * nothing else — no offline caching — so there is no stale-asset failure mode.
 *
 * The payload is what `alert.evaluator.js` sends, so the field names are the
 * camelCase ones the API uses everywhere else.
 */

const CLICK_TARGET = '/history';

self.addEventListener('install', () => {
	// Take over immediately instead of waiting for every tab to close.
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
	let payload = {};
	try {
		payload = event.data ? event.data.json() : {};
	} catch {
		payload = {};
	}

	// The push subscription was made with `userVisibleOnly: true`, so a
	// notification has to be shown even when the payload is unusable —
	// otherwise the browser shows its own "site updated in background".
	const title = payload.title || 'Weather alert';

	event.waitUntil(
		self.registration.showNotification(title, {
			body: payload.body || '',
			data: payload,
			// One rule replaces its own previous notification rather than
			// stacking; `renotify` still alerts the user to the new value.
			tag: payload.ruleId ? `rule-${payload.ruleId}` : 'alert',
			renotify: true,
			requireInteraction: payload.severity === 'critical',
			timestamp: Date.parse(payload.issuedAt) || Date.now(),
		}),
	);
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();

	event.waitUntil(
		(async () => {
			const clients = await self.clients.matchAll({
				type: 'window',
				includeUncontrolled: true,
			});

			// Reuse a tab that is already on this origin instead of opening a
			// second copy of the app.
			for (const client of clients) {
				if ('focus' in client) {
					await client.focus();
					if ('navigate' in client) {
						await client.navigate(CLICK_TARGET).catch(() => {});
					}
					return;
				}
			}

			await self.clients.openWindow(CLICK_TARGET);
		})(),
	);
});
