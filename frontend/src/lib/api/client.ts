import { isApiError } from './errors';
import { rawRequest, type RequestOptions } from './http';
import { refreshTokens } from '../auth/refresh';
import { getTokens } from '../auth/tokens';

const withAuth = (options: RequestOptions, accessToken: string): RequestOptions => ({
	...options,
	headers: { ...options.headers, Authorization: `Bearer ${accessToken}` },
});

const isAuthPath = (path: string) => path.startsWith('/auth/');

export async function apiRequest<T>(
	path: string,
	options: RequestOptions = {},
): Promise<T> {
	const tokens = getTokens();

	// /auth/* is how you obtain tokens; a 401 there means bad credentials.
	if (!tokens || isAuthPath(path)) return rawRequest<T>(path, options);

	try {
		return await rawRequest<T>(path, withAuth(options, tokens.accessToken));
	} catch (err) {
		if (!isApiError(err) || !err.isExpiredAccessToken) throw err;

		const next = await refreshTokens();

		// rawRequest, not apiRequest — recursion is structurally impossible.
		return rawRequest<T>(path, withAuth(options, next.accessToken));
	}
}