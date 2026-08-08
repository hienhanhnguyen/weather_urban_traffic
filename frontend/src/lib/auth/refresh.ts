import { rawRequest } from '../api/http';
import { clearTokens, getTokens, setTokens } from './tokens';
import type { AuthResponse, TokenPair } from './types';

let inFlight: Promise<TokenPair> | null = null;

let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null): void {
	onSessionExpired = handler;
}

export function refreshTokens(): Promise<TokenPair> {
	if (inFlight) return inFlight;

	inFlight = run().finally(() => {
		inFlight = null;
	});

	return inFlight;
}

async function run(): Promise<TokenPair> {
	const current = getTokens();

	if (!current) {
		onSessionExpired?.();
		throw new Error('No refresh token available');
	}

	try {
		const res = await rawRequest<AuthResponse>('/auth/refresh', {
			method: 'POST',
			body: { refreshToken: current.refreshToken },
		});

		const next: TokenPair = {
			accessToken: res.accessToken,
			refreshToken: res.refreshToken,
		};

		setTokens(next);
		return next;
	} catch (err) {
		clearTokens();
		onSessionExpired?.();
		throw err;
	}
}