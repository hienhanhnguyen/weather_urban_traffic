"use client";

import { RequireRole } from "@/features/auth/RequireRole";

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireRole accountTypes={["business"]}>{children}</RequireRole>;
}
