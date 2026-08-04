const config = require('../../shared/config');
const logger = require('../../shared/logger');
const {
	AppError,
	BadRequestError,
	NotFoundError,
	ServiceUnavailableError,
} = require('../../shared/errors');

const BASE_URL = 'https://api.openweathermap.org';
const UNAVAILABLE = 'Weather service is temporarily unavailable';

function mapUpstreamError(status, payload, path) {
	const upstreamMessage = payload?.message ?? 'unknown upstream error';

	if (status === 401 || status === 403) {
		logger.error(
			{ status, path, upstreamMessage },
			'OpenWeather rejected our API key'
		);
		return new ServiceUnavailableError(UNAVAILABLE);
	}

	if (status === 404) {
		return new NotFoundError('No weather data for that location');
	}

	if (status === 429) {
		logger.warn({ status, path }, 'OpenWeather rate limit reached');
		return new ServiceUnavailableError(UNAVAILABLE);
	}

	if (status >= 500) {
		logger.warn({ status, path, upstreamMessage }, 'OpenWeather is failing');
		return new ServiceUnavailableError(UNAVAILABLE);
	}

	return new BadRequestError(`Weather request rejected: ${upstreamMessage}`, {
		code: 'WEATHER_BAD_REQUEST',
	});
}

async function request(path, query) {
	const params = new URLSearchParams({
		...query,
		appid: config.weather.apiKey,
	});

	const controller = new AbortController();
	const timer = setTimeout(
		() => controller.abort(),
		config.weather.timeoutMs
	);

	try {
		const response = await fetch(`${BASE_URL}${path}?${params}`, {
			signal: controller.signal,
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
				'OpenWeather request timed out'
			);
			throw new ServiceUnavailableError(UNAVAILABLE);
		}

		logger.error({ err, path }, 'OpenWeather request failed');
		throw new ServiceUnavailableError(UNAVAILABLE);
	} finally {
		clearTimeout(timer);
	}
}

module.exports = { request };