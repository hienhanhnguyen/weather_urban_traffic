const config = require('../../shared/config');
const logger = require('../../shared/logger');
const {
	AppError,
	BadRequestError,
	ServiceUnavailableError,
} = require('../../shared/errors');

const UNAVAILABLE = 'Map service is temporarily unavailable';

function mapUpstreamError(status, provider) {
	if (status === 429) {
		logger.warn({ status, provider }, 'Geocoding provider rate limit reached');
		return new ServiceUnavailableError(UNAVAILABLE);
	}

	if (status >= 500) {
		logger.warn({ status, provider }, 'Geocoding provider is failing');
		return new ServiceUnavailableError(UNAVAILABLE);
	}

	return new BadRequestError('Map request rejected', { code: 'GEO_BAD_REQUEST' });
}

async function request(url, provider) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), config.geo.timeoutMs);

	try {
		const response = await fetch(url, {
			signal: controller.signal,
			headers: { 'User-Agent': config.geo.userAgent, Accept: 'application/json' },
		});

		const payload = await response.json().catch(() => null);

		if (!response.ok) {
			throw mapUpstreamError(response.status, provider);
		}

		return payload;
	} catch (err) {
		if (err instanceof AppError) throw err;

		if (err.name === 'AbortError' || err.name === 'TimeoutError') {
			logger.warn(
				{ provider, timeoutMs: config.geo.timeoutMs },
				'Geocoding request timed out'
			);
			throw new ServiceUnavailableError(UNAVAILABLE);
		}

		logger.error({ err, provider }, 'Geocoding request failed');
		throw new ServiceUnavailableError(UNAVAILABLE);
	} finally {
		clearTimeout(timer);
	}
}

module.exports = { request };
