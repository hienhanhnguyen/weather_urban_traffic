import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { isApiError } from '@/lib/api/errors';

// Turn a failed request into form state

export function applyApiError<T extends FieldValues>(
	error: unknown,
	setError: UseFormSetError<T>,
	knownFields: readonly Path<T>[],
	fallback: string,
): string {
	if (!isApiError(error)) {
		return fallback;
	}

	const fieldErrors = error.fieldErrors;
	if (!fieldErrors) return error.message;

	const unmatched: string[] = [];

	for (const [field, message] of Object.entries(fieldErrors)) {
		if (knownFields.includes(field as Path<T>)) {
			setError(field as Path<T>, { type: 'server', message });
		} else {
			unmatched.push(message);
		}
	}

	return unmatched.join(' ');
}
