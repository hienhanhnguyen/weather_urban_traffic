"use client";

import { useSession } from "@/lib/auth/session";

export default function HomePage() {
  const { user } = useSession();

  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">
        Welcome{user?.username ? `, ${user.username}` : ""}
      </h1>
      <p className="text-sm opacity-70">
        Signed in as {user?.email} &middot; {user?.accountType} account &middot;
        roles: {user?.roles.join(", ")}
      </p>
    </section>
  );
}
