"use client";

import { Suspense } from "react";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { AppHeader } from "@/features/shell/AppHeader";
import { EmailVerificationBanner } from "@/features/auth/EmailVerificationBanner";
import { FullPageSpinner } from "@/components/ui/FullPageSpinner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <RequireAuth>
        <AppHeader />
        <EmailVerificationBanner />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>
      </RequireAuth>
    </Suspense>
  );
}
