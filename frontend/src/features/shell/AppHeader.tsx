"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { useSession } from "@/lib/auth/session";
import { NotificationBell } from "@/features/notifications/NotificationBell";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { landingPath } from "./nav";
import { useSidebar } from "./sidebar-state";

export function AppHeader() {
  const t = useTranslations();
  const { user } = useSession();
  const { openMobile } = useSidebar();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4">
        <button
          type="button"
          onClick={openMobile}
          aria-label={t("nav.openMenu")}
          className="rounded-md p-2 hover:bg-black/5 md:hidden dark:hover:bg-white/10"
        >
          <Menu aria-hidden="true" className="size-5" />
        </button>

        <Link href={landingPath(user)} className="text-sm font-semibold">
          {t("app.name")}
        </Link>

        <div className="ml-auto flex items-center gap-3">
          <NotificationBell />
          <LocaleSwitcher />
          <ThemeToggle />

          <UserMenu />
        </div>
      </div>
    </header>
  );
}
