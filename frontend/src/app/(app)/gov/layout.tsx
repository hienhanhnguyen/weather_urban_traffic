"use client";

import { RequireRole } from "@/features/auth/RequireRole";

export default function GovLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireRole roles={["admin"]}>{children}</RequireRole>;
}
