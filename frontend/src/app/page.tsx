"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/session";
import { FullPageSpinner } from "@/components/ui/FullPageSpinner";

export default function IndexPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    router.replace(status === "authenticated" ? "/home" : "/login");
  }, [status, router]);

  return <FullPageSpinner />;
}
