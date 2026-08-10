"use client";

import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/Button";

export function AppHeader() {
  const { user, signOut } = useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <header className="border-b border-black/10 dark:border-white/15">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <span className="text-sm font-semibold">SWTIS</span>

        <div className="flex items-center gap-3">
          <span className="text-sm opacity-70">
            {user?.username ?? user?.email}
          </span>
          <Button variant="secondary" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
