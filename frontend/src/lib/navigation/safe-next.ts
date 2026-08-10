export function safeNext(value: string | null | undefined, fallback: string): string {
	if (!value) return fallback;
	if (!value.startsWith('/')) return fallback;
	if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
	return value;
}
