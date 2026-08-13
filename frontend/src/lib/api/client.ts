import { isApiError } from './errors';
import { rawRequest, type RequestOptions } from './http';
import { refreshTokens } from '../auth/refresh';
import { getTokens } from '../auth/tokens';

const withAuth = (options: RequestOptions, accessToken: string): RequestOptions => ({
	...options,
	headers: { ...options.headers, Authorization: `Bearer ${accessToken}` },
});

const CREDENTIAL_PATHS = new Set([
	'/auth/signup',
	'/auth/signin',
	'/auth/google',
	'/auth/refresh',
	'/auth/signout',
	'/auth/password/forgot',
	'/auth/password/verify-otp',
	'/auth/password/reset',
]);

const isCredentialPath = (path: string) => CREDENTIAL_PATHS.has(path);

export async function apiRequest<T>(
	path: string,
	options: RequestOptions = {},
): Promise<T> {
	const tokens = getTokens();

	if (!tokens || isCredentialPath(path)) return rawRequest<T>(path, options);

	try {
		return await rawRequest<T>(path, withAuth(options, tokens.accessToken));
	} catch (err) {
		if (!isApiError(err) || !err.isExpiredAccessToken) throw err;

		const next = await refreshTokens();

		return rawRequest<T>(path, withAuth(options, next.accessToken));
	}
}