"use client";

import { Suspense } from "react";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { EmailVerificationBanner } from "@/features/auth/EmailVerificationBanner";
import { LocaleSync } from "@/features/shell/LocaleSync";
import { AppHeader } from "@/features/shell/AppHeader";
import { Sidebar } from "@/features/shell/Sidebar";
import { SidebarProvider } from "@/features/shell/sidebar-state";
import { FullPageSpinner } from "@/components/ui/FullPageSpinner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <RequireAuth>
        {/* Inside RequireAuth, so it only fetches preferences once there is a
            token to fetch them with. */}
        <LocaleSync />

        <SidebarProvider>
          <div className="flex min-h-dvh">
            <Sidebar />

            <div className="flex min-w-0 flex-1 flex-col">
              <AppHeader />
              <EmailVerificationBanner />
              <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
                {children}
              </main>
            </div>
          </div>
        </SidebarProvider>
      </RequireAuth>
    </Suspense>
  );
}
