import type { TokenPair } from './types';

const ACCESS_KEY = 'swtis.accessToken';
const REFRESH_KEY = 'swtis.refreshToken';

// set of callback functions
const listeners = new Set<() => void>();

let cache: TokenPair | null = null;
let cacheLoaded = false;

function read(): TokenPair | null {
	if (typeof window === 'undefined') return null;

	const accessToken = window.localStorage.getItem(ACCESS_KEY);
	const refreshToken = window.localStorage.getItem(REFRESH_KEY);

	if (!accessToken || !refreshToken) return null;
	return { accessToken, refreshToken };
}

function emit(): void {
	for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent): void {
	// key === null means localStorage.clear() was called
	if (event.key !== null && event.key !== ACCESS_KEY && event.key !== REFRESH_KEY) return;

	cache = read();
	cacheLoaded = true;
	emit();
}

export function getTokens(): TokenPair | null {
	if (!cacheLoaded) {
		cache = read();
		cacheLoaded = true;
	}
	return cache;
}

export function setTokens(tokens: TokenPair): void {
	cache = tokens;
	cacheLoaded = true;

	if (typeof window !== 'undefined') {
		window.localStorage.setItem(ACCESS_KEY, tokens.accessToken);
		window.localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
	}

	emit();
}

export function clearTokens(): void {
	cache = null;
	cacheLoaded = true;

	if (typeof window !== 'undefined') {
		window.localStorage.removeItem(ACCESS_KEY);
		window.localStorage.removeItem(REFRESH_KEY);
	}

	emit();
}

export function subscribe(listener: () => void): () => void {
	listeners.add(listener);

	if (listeners.size === 1 && typeof window !== 'undefined') {
		window.addEventListener('storage', onStorage);
	}

	return () => {
		listeners.delete(listener);
		if (listeners.size === 0 && typeof window !== 'undefined') {
			window.removeEventListener('storage', onStorage);
		}
	};
}