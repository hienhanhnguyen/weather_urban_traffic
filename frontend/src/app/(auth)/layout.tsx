"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth/session";
import { safeNext } from "@/lib/navigation/safe-next";
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

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <RedirectIfSignedIn>
        <main className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="w-full max-w-sm">
            <div className="mb-8 text-center">
              <h1 className="text-xl font-semibold tracking-tight">SWTIS</h1>
              <p className="mt-1 text-sm opacity-70">
                Real-time weather forecasting system for urban transport
                networks in Ho Chi Minh City
              </p>
              <p className="mt-1 text-sm opacity-70"></p>
            </div>
            {children}
          </div>
        </main>
      </RedirectIfSignedIn>
    </Suspense>
  );
}
