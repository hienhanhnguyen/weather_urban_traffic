import { apiRequest } from '@/lib/api/client';
import type { AccountType, AuthResponse, User } from '@/lib/auth/types';

export interface SignUpInput {
	email: string;
	password: string;
	username?: string;
	accountType: Extract<AccountType, 'individual' | 'business'>;
}

export interface SignInInput {
	email: string;
	password: string;
}

const post = <T>(path: string, body?: unknown) =>
	apiRequest<T>(path, { method: 'POST', body });

export const signUp = (input: SignUpInput) =>
	post<AuthResponse>('/auth/signup', input);

export const signIn = (input: SignInInput) =>
	post<AuthResponse>('/auth/signin', input);

export const signInWithGoogle = (idToken: string) =>
	post<AuthResponse>('/auth/google', { idToken });

export const signOut = (refreshToken: string) =>
	post<void>('/auth/signout', { refreshToken });

export const getMe = () =>
	apiRequest<{ user: User }>('/auth/me').then((res) => res.user);


export const requestPasswordReset = (email: string) =>
	post<{ message: string }>('/auth/password/forgot', { email });

export const verifyResetOtp = (email: string, code: string) =>
	post<{ resetToken: string }>('/auth/password/verify-otp', { email, code });

export const resetPassword = (resetToken: string, newPassword: string) =>
	post<{ message: string }>('/auth/password/reset', {
		resetToken,
		newPassword,
	});

export const sendEmailVerification = () =>
	post<{ message: string }>('/auth/email/send-verification');

export const verifyEmail = (code: string) =>
	post<{ user: User }>('/auth/email/verify', { code });
