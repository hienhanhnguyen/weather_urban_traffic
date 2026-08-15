"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/session";
import { landingPath } from "@/features/shell/nav";
import { FullPageSpinner } from "@/components/ui/FullPageSpinner";

export default function IndexPage() {
  const { status, user } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    router.replace(status === "authenticated" ? landingPath(user) : "/login");
  }, [status, user, router]);

  return <FullPageSpinner />;
}
