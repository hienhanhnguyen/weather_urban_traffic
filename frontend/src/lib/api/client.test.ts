// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from './client';
import { clearTokens, setTokens } from '../auth/tokens';

const json = (status: number, body: unknown) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

describe('which requests carry the access token', () => {
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		clearTokens();
		setTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });

		fetchMock = vi.fn(async () => json(200, {}));
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		clearTokens();
	});

	const authorizationFor = async (path: string) => {
		await apiRequest(path, { method: 'POST', body: {} });
		const init = fetchMock.mock.calls.at(-1)?.[1] as RequestInit;
		return new Headers(init.headers).get('Authorization');
	};

	it.each([
		'/auth/me',
		'/auth/email/send-verification',
		'/auth/email/verify',
		'/auth/password/change',
		'/locations',
	])('sends it to %s', async (path) => {
		expect(await authorizationFor(path)).toBe('Bearer access-1');
	});

	it.each([
		'/auth/signup',
		'/auth/signin',
		'/auth/google',
		'/auth/refresh',
		'/auth/signout',
		'/auth/password/forgot',
		'/auth/password/verify-otp',
		'/auth/password/reset',
	])('withholds it from %s', async (path) => {
		expect(await authorizationFor(path)).toBeNull();
	});
});
