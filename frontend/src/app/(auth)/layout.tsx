"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSession } from "@/lib/auth/session";
import { safeNext } from "@/lib/navigation/safe-next";
import { LocaleSwitcher } from "@/features/shell/LocaleSwitcher";
import { ThemeToggle } from "@/features/shell/ThemeToggle";
import { FullPageSpinner } from "@/components/ui/FullPageSpinner";

function RedirectIfSignedIn({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status !== "authenticated") return;
    router.replace(safeNext(searchParams.get("next"), "/home"));
  }, [status, router, searchParams]);

  if (status === "loading" || status === "authenticated") {
    return <FullPageSpinner />;
  }

  return <>{children}</>;
}

function Branding() {
  const t = useTranslations("app");

  return (
    <div className="mb-8 text-center">
      <h1 className="text-xl font-semibold tracking-tight">{t("name")}</h1>
      <p className="mt-1 text-sm opacity-70">{t("tagline")}</p>
    </div>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <RedirectIfSignedIn>
        {/* Language and theme are reachable before signing in - someone who
            cannot read the form cannot sign in to change the setting. */}
        <div className="flex justify-end gap-2 px-4 py-3">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>

        <main className="flex flex-1 items-center justify-center px-4 pb-10">
          <div className="w-full max-w-sm">
            <Branding />
            {children}
          </div>
        </main>
      </RedirectIfSignedIn>
    </Suspense>
  );
}
