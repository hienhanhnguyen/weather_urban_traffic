import { z } from 'zod';

const email = z
	.string()
	.min(1, 'Email is required')
	.max(255, 'Email is too long')
	.email('Enter a valid email address');

const password = z
	.string()
	.min(8, 'Use at least 8 characters')
	.max(72, 'Use at most 72 characters');

const otpCode = z
	.string()
	.length(6, 'The code is 6 digits')
	.regex(/^\d+$/, 'Digits only');

export const signInSchema = z.object({
	email,
	password: z.string().min(1, 'Password is required').max(72),
});

export const signUpSchema = z
	.object({
		email,
		// Optional field: the backend wants it absent, not empty, so the form
		// strips a blank value before submitting.
		username: z
			.string()
			.regex(/^[a-zA-Z0-9]*$/, 'Letters and numbers only')
			.max(64, 'Use at most 64 characters')
			.refine((v) => v === '' || v.length >= 3, 'Use at least 3 characters'),
		password,
		confirmPassword: z.string(),
		accountType: z.enum(['individual', 'business']),
	})
	.refine((values) => values.password === values.confirmPassword, {
		path: ['confirmPassword'],
		message: 'Passwords do not match',
	});

export const forgotPasswordSchema = z.object({ email });

export const otpSchema = z.object({ code: otpCode });

export const resetPasswordSchema = z
	.object({ password, confirmPassword: z.string() })
	.refine((values) => values.password === values.confirmPassword, {
		path: ['confirmPassword'],
		message: 'Passwords do not match',
	});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type OtpValues = z.infer<typeof otpSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
