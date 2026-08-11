import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
	plugins: [tsconfigPaths(), react()],
	test: {
		// Most suites here are pure modules. Loading jsdom for them costs about
		// a minute per file on WSL and times the workers out, so a DOM is opted
		// into per file with `// @vitest-environment jsdom`.
		environment: 'node',
		setupFiles: ['./vitest.setup.ts'],
		// http.ts throws at import time if this is missing. Next inlines
		// NEXT_PUBLIC_* at build time; Vitest does not, so set it here.
		env: {
			NEXT_PUBLIC_API_URL: 'http://localhost:3000/api',
		},
	},
});