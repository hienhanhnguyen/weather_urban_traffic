'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '@/lib/auth/session';

export function EmailVerificationBanner() {
	const { user } = useSession();
	const pathname = usePathname();

	if (!user || user.emailVerified) return null;
	// No point nagging on the page that fixes it.
	if (pathname === '/verify-email') return null;

	return (
		<div className="border-b border-amber-500/40 bg-amber-500/10">
			<p className="mx-auto w-full max-w-5xl px-4 py-2 text-sm">
				Your email address is not verified yet.{' '}
				<Link href="/verify-email" className="font-medium underline underline-offset-4">
					Verify it now
				</Link>
			</p>
		</div>
	);
}
