export {};

// The DOM matchers only make sense — and only load — where there is a DOM.
if (typeof document !== 'undefined') {
	await import('@testing-library/jest-dom/vitest');
}
