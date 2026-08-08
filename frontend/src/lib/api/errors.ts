export type ValidationDetail = {
	field: string;
	message: string;
};

export type ApiErrorBody = {
	error: {
		code: string;
		message: string;
		requestId?: string;
		details?: ValidationDetail[];
	};
};

export type ApiErrorCode =
	| 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND'
	| 'CONFLICT' | 'RATE_LIMITED' | 'SERVICE_UNAVAILABLE' | 'INTERNAL_ERROR'
	| 'NO_TOKEN' | 'INVALID_TOKEN'
	| 'INVALID_REFRESH_TOKEN' | 'REFRESH_TOKEN_REUSED'
	| (string & {});

export class ApiError extends Error {
	readonly status: number;
	readonly code: ApiErrorCode;
	readonly requestId?: string;
	readonly details?: ValidationDetail[];

	constructor(init: {
		status: number;
		code: ApiErrorCode;
		message: string;
		requestId?: string;
		details?: ValidationDetail[];
	}) {
		super(init.message);
		this.name = 'ApiError';
		this.status = init.status;
		this.code = init.code;
		this.requestId = init.requestId;
		this.details = init.details;
	}

	get isExpiredAccessToken(): boolean {
		return this.status === 401 && this.code === 'INVALID_TOKEN';
	}

	get isSessionDead(): boolean {
		return (
			this.status === 401 &&
			(this.code === 'INVALID_REFRESH_TOKEN' || this.code === 'REFRESH_TOKEN_REUSED')
		);
	}

	get fieldErrors(): Record<string, string> | undefined {
		if (!this.details?.length) return undefined;
		const out: Record<string, string> = {};
		for (const detail of this.details) {
			out[detail.field] ??= detail.message;
		}
		return out;
	}
}

export function isApiError(err: unknown): err is ApiError {
	return err instanceof ApiError;
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
	if (typeof value !== 'object' || value === null) return false;
	const { error } = value as { error?: unknown };
	if (typeof error !== 'object' || error === null) return false;
	const { code, message } = error as { code?: unknown; message?: unknown };
	return typeof code === 'string' && typeof message === 'string';
}

export async function toApiError(res: Response): Promise<ApiError> {
	let body: unknown;
	try {
		body = await res.json();
	} catch {
		body = undefined;
	}

	if (isApiErrorBody(body)) {
		return new ApiError({
			status: res.status,
			code: body.error.code,
			message: body.error.message,
			requestId: body.error.requestId,
			details: body.error.details,
		});
	}

	return new ApiError({
		status: res.status,
		code: 'INTERNAL_ERROR',
		message: res.statusText || `Request failed with status ${res.status}`,
	});
}