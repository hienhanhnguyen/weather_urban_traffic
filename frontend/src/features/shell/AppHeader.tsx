"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { useSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "./ThemeToggle";
import { useSidebar } from "./sidebar-state";

const ACCOUNT_LABELS = {
  individual: "Individual",
  business: "Business",
  admin_officer: "Government",
} as const;

export function AppHeader() {
  const { user, signOut } = useSession();
  const { openMobile } = useSidebar();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={openMobile}
          aria-label="Open menu"
          className="rounded-md p-2 hover:bg-black/5 md:hidden dark:hover:bg-white/10"
        >
          <Menu aria-hidden="true" className="size-5" />
        </button>

        <Link href="/home" className="text-sm font-semibold">
          SWTIS
        </Link>

        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />

          <Link
            href="/account"
            className="hidden text-right text-sm leading-tight sm:block"
          >
            <span className="block">{user?.username ?? user?.email}</span>
            {user && (
              <span className="block text-xs opacity-60">
                {ACCOUNT_LABELS[user.accountType]}
              </span>
            )}
          </Link>

          <Button variant="secondary" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
