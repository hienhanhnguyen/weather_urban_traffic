'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { signIn } from '@/features/auth/api';
import { signInSchema, type SignInValues } from '@/features/auth/schemas';
import { useSession } from '@/lib/auth/session';
import { applyApiError } from '@/lib/forms/api-errors';
import { safeNext } from '@/lib/navigation/safe-next';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { TextField } from '@/components/ui/TextField';

export default function LoginPage() {
	const { adopt } = useSession();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [formError, setFormError] = useState('');

	const {
		register,
		handleSubmit,
		setError,
		formState: { errors },
	} = useForm<SignInValues>({
		resolver: zodResolver(signInSchema),
		defaultValues: { email: '', password: '' },
	});

	const mutation = useMutation({
		mutationFn: signIn,
		onSuccess: (response) => {
			adopt(response);
			router.replace(safeNext(searchParams.get('next'), '/home'));
		},
		onError: (error) => {
			setFormError(applyApiError(error, setError, ['email', 'password']));
		},
	});

	const onSubmit = (values: SignInValues) => {
		setFormError('');
		mutation.mutate(values);
	};

	return (
		<form
			onSubmit={handleSubmit(onSubmit)}
			noValidate
			className="flex flex-col gap-4 rounded-lg border border-black/10 p-6 dark:border-white/15"
		>
			<h2 className="text-lg font-semibold">Sign in</h2>

			<Callout tone="error">{formError}</Callout>

			<TextField
				label="Email"
				type="email"
				autoComplete="email"
				error={errors.email?.message}
				{...register('email')}
			/>

			<TextField
				label="Password"
				type="password"
				autoComplete="current-password"
				error={errors.password?.message}
				{...register('password')}
			/>

			<Button type="submit" loading={mutation.isPending}>
				Sign in
			</Button>

			<div className="flex justify-between text-sm">
				<Link href="/forgot-password" className="underline-offset-4 hover:underline">
					Forgot password?
				</Link>
				<Link href="/signup" className="underline-offset-4 hover:underline">
					Create an account
				</Link>
			</div>
		</form>
	);
}
