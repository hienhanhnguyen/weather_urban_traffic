// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ACCESS_KEY = 'swtis.accessToken';
const REFRESH_KEY = 'swtis.refreshToken';

const json = (status: number, body: unknown) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

const expiredAccessToken = () =>
	json(401, { error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } });

const refreshOk = (accessToken: string, refreshToken: string) =>
	json(200, {
		user: { id: 1, email: 'a@b.c', username: 'a', accountType: 'personal', roles: [] },
		accessToken,
		refreshToken,
	});

// Fresh module registry so `inFlight` starts null in every test
async function loadClient() {
	vi.resetModules();
	return (await import('../api/client')).apiRequest;
}

describe('single-flight refresh', () => {
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		localStorage.clear();
		localStorage.setItem(ACCESS_KEY, 'stale-access');
		localStorage.setItem(REFRESH_KEY, 'refresh-1');

		fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('calls /auth/refresh exactly once for three concurrent 401s', async () => {
		const apiRequest = await loadClient();
		let refreshCalls = 0;

		fetchMock.mockImplementation(async (input: RequestInfo, init?: RequestInit) => {
			const url = String(input);

			if (url.endsWith('/auth/refresh')) {
				refreshCalls += 1;
				return refreshOk('fresh-access', 'refresh-2');
			}

			const auth = new Headers(init?.headers).get('Authorization');
			return auth === 'Bearer fresh-access'
				? json(200, { url })
				: expiredAccessToken();
		});

		const results = await Promise.all([
			apiRequest<{ url: string }>('/locations'),
			apiRequest<{ url: string }>('/alerts/rules'),
			apiRequest<{ url: string }>('/users/me'),
		]);

		expect(refreshCalls).toBe(1);
		expect(results).toHaveLength(3);
		expect(localStorage.getItem(REFRESH_KEY)).toBe('refresh-2');
	});

	it('clears the session when refresh itself fails', async () => {
		const apiRequest = await loadClient();

		fetchMock.mockImplementation(async (input: RequestInfo) =>
			String(input).endsWith('/auth/refresh')
				? json(401, {
						error: { code: 'REFRESH_TOKEN_REUSED', message: 'Invalid refresh token' },
					})
				: expiredAccessToken(),
		);

		await expect(apiRequest('/locations')).rejects.toMatchObject({
			code: 'REFRESH_TOKEN_REUSED',
		});
		expect(localStorage.getItem(ACCESS_KEY)).toBeNull();
	});

  it('allows a new refresh after the previous one settled', async () => {
    const apiRequest = await loadClient();
    let refreshCalls = 0;
    const expired = new Set(['stale-access']);

    fetchMock.mockImplementation(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith('/auth/refresh')) {
        refreshCalls += 1;
        return refreshOk(`access-${refreshCalls}`, `refresh-${refreshCalls + 1}`);
      }

      const token =
        new Headers(init?.headers).get('Authorization')?.replace('Bearer ', '') ?? '';

      return expired.has(token) ? expiredAccessToken() : json(200, { url });
    });

    await apiRequest('/locations');   // stale-access expired → refresh #1

    expired.add('access-1');          // time passes; the new token expires too

    await apiRequest('/users/me');    // access-1 expired → refresh #2

    expect(refreshCalls).toBe(2);
  });

	it('does not refresh when /auth/signin returns 401', async () => {
		const apiRequest = await loadClient();
		let refreshCalls = 0;

		fetchMock.mockImplementation(async (input: RequestInfo) => {
			if (String(input).endsWith('/auth/refresh')) refreshCalls += 1;
			return json(401, {
				error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
			});
		});

		await expect(apiRequest('/auth/signin', { method: 'POST', body: {} })).rejects.toBeTruthy();
		expect(refreshCalls).toBe(0);
	});
});