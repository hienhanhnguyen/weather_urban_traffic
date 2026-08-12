"use client";

import { Suspense } from "react";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { EmailVerificationBanner } from "@/features/auth/EmailVerificationBanner";
import { LocaleSync } from "@/features/shell/LocaleSync";
import { NotificationProvider } from "@/features/notifications/NotificationProvider";
import { AlertToastHost } from "@/features/notifications/AlertToastHost";
import { AppHeader } from "@/features/shell/AppHeader";
import { Sidebar } from "@/features/shell/Sidebar";
import { SkipLink } from "@/features/shell/SkipLink";
import { SidebarProvider } from "@/features/shell/sidebar-state";
import { FullPageSpinner } from "@/components/ui/FullPageSpinner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <RequireAuth>
        <LocaleSync />

        <NotificationProvider>
          <SidebarProvider>
            <SkipLink />

            <div className="flex min-h-dvh">
              <Sidebar />

              <div className="flex min-w-0 flex-1 flex-col">
                <AppHeader />
                <EmailVerificationBanner />
                <main
                  id="main-content"
                  tabIndex={-1}
                  className="mx-auto w-full max-w-5xl flex-1 px-4 py-8"
                >
                  {children}
                </main>
              </div>
            </div>
          </SidebarProvider>

          <AlertToastHost />
        </NotificationProvider>
      </RequireAuth>
    </Suspense>
  );
}
