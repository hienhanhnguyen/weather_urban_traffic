const config = require('../../shared/config');
const logger = require('../../shared/logger');
const {
	AppError,
	BadRequestError,
	ServiceUnavailableError,
} = require('../../shared/errors');

const UNAVAILABLE = 'Weather service is temporarily unavailable';

function mapUpstreamError(status, payload, path) {
	const reason = payload?.reason ?? 'unknown upstream error';

	if (status === 429) {
		logger.warn({ status, path }, 'Weather provider rate limit reached');
		return new ServiceUnavailableError(UNAVAILABLE);
	}

	if (status >= 500) {
		logger.warn({ status, path, reason }, 'Weather provider is failing');
		return new ServiceUnavailableError(UNAVAILABLE);
	}

	logger.warn({ status, path, reason }, 'Weather provider rejected a request');
	return new BadRequestError('Weather request rejected', {
		code: 'WEATHER_BAD_REQUEST',
	});
}

async function request(path, query) {
	const params = new URLSearchParams(query);

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), config.weather.timeoutMs);

	try {
		const response = await fetch(`${config.weather.baseUrl}${path}?${params}`, {
			signal: controller.signal,
			headers: { Accept: 'application/json' },
		});

		const payload = await response.json().catch(() => null);

		if (!response.ok) {
			throw mapUpstreamError(response.status, payload, path);
		}

		return payload;
	} catch (err) {
		if (err instanceof AppError) throw err;

		if (err.name === 'AbortError' || err.name === 'TimeoutError') {
			logger.warn(
				{ path, timeoutMs: config.weather.timeoutMs },
				'Weather request timed out'
			);
			throw new ServiceUnavailableError(UNAVAILABLE);
		}

		logger.error({ err, path }, 'Weather request failed');
		throw new ServiceUnavailableError(UNAVAILABLE);
	} finally {
		clearTimeout(timer);
	}
}

module.exports = { request };
