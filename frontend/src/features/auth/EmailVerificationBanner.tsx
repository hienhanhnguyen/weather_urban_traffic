"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSession } from "@/lib/auth/session";

export function EmailVerificationBanner() {
  const t = useTranslations("verifyEmail.banner");
  const { user } = useSession();
  const pathname = usePathname();

  if (!user || user.emailVerified) return null;
  if (pathname === "/verify-email") return null;

  return (
    <div className="border-b border-amber-500/40 bg-amber-500/10">
      <p className="mx-auto w-full max-w-5xl px-4 py-2 text-sm">
        {t("message")}{" "}
        <Link
          href="/verify-email"
          className="font-medium underline underline-offset-4"
        >
          {t("action")}
        </Link>
      </p>
    </div>
  );
}
