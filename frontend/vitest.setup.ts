export {};

// The DOM matchers only make sense — and only load — where there is a DOM.
if (typeof document !== 'undefined') {
	await import('@testing-library/jest-dom/vitest');

	// Testing Library only auto-cleans when Vitest runs with `globals: true`,
	// which this config does not. Without it a second render in the same file
	// finds the first one still mounted.
	const { cleanup } = await import('@testing-library/react');
	const { afterEach } = await import('vitest');

	afterEach(cleanup);
}
