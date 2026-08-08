import { toApiError } from './errors';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type QueryParams = Record<string, string | number | boolean | undefined>;

export type RequestOptions = {
	method?: HttpMethod;
	body?: unknown;
	query?: QueryParams;
	headers?: Record<string, string>;
	signal?: AbortSignal;
};

const rawBase = process.env.NEXT_PUBLIC_API_URL;

if (!rawBase) {
	throw new Error('NEXT_PUBLIC_API_URL is not set.');
}

export const API_BASE_URL = rawBase.replace(/\/+$/, '');

export function buildUrl(path: string, query?: QueryParams): string {
	const url = new URL(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`);

	for (const [key, value] of Object.entries(query ?? {})) {
		if (value !== undefined) url.searchParams.set(key, String(value));
	}

	return url.toString();
}

export async function rawRequest<T>(
	path: string,
	options: RequestOptions = {},
): Promise<T> {
	const { method = 'GET', body, query, headers, signal } = options;

	const res = await fetch(buildUrl(path, query), {
		method,
		signal,
		headers: {
			Accept: 'application/json',
			...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
			...headers,
		},
		body: body === undefined ? undefined : JSON.stringify(body),
	});

	if (!res.ok) throw await toApiError(res);

	if (res.status === 204 || res.status === 205) return undefined as T;

	return (await res.json()) as T;
}