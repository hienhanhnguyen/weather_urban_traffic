"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth/session";
import type { AccountType, Role } from "@/lib/auth/types";

interface RequireRoleProps {
  // Any one of these is enough
  roles?: Role[];
  accountTypes?: AccountType[];
  children: React.ReactNode;
}

export function RequireRole({
  roles,
  accountTypes,
  children,
}: RequireRoleProps) {
  const { user } = useSession();

  if (!user) return null;

  const allowed =
    (roles?.some((role) => user.roles.includes(role)) ?? false) ||
    (accountTypes?.includes(user.accountType) ?? false);

  if (allowed) return <>{children}</>;

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-semibold">You do not have access</h1>
      <p className="mt-2 text-sm opacity-70">
        This area is limited to accounts with different permissions. If you
        believe this is wrong, contact an administrator.
      </p>
      <Link
        href="/home"
        className="mt-6 inline-block text-sm text-sky-700 underline underline-offset-4 dark:text-sky-300"
      >
        Back to overview
      </Link>
    </div>
  );
}
