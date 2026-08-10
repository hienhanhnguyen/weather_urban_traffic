"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth/session";
import { FullPageSpinner } from "@/components/ui/FullPageSpinner";

// Client-side only, only UX redirect
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status !== "anonymous") return;

    const query = searchParams.toString();
    const next = query ? `${pathname}?${query}` : pathname;

    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [status, router, pathname, searchParams]);

  if (status !== "authenticated") return <FullPageSpinner />;

  return <>{children}</>;
}
