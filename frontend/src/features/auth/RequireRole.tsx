"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useSession } from "@/lib/auth/session";
import { landingPath } from "@/features/shell/nav";
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
  const t = useTranslations("access");
  const { user } = useSession();

  if (!user) return null;

  const allowed =
    (roles?.some((role) => user.roles.includes(role)) ?? false) ||
    (accountTypes?.includes(user.accountType) ?? false);

  if (allowed) return <>{children}</>;

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <p className="mt-2 text-sm opacity-70">{t("description")}</p>
      <Link
        href={landingPath(user)}
        className="mt-6 inline-block text-sm text-sky-700 underline underline-offset-4 dark:text-sky-300"
      >
        {t("back")}
      </Link>
    </div>
  );
}
