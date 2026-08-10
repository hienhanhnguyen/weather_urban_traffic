"use client";

import { useTranslations } from "next-intl";
import { useSession } from "@/lib/auth/session";
import { FavoriteLocations } from "@/features/locations/FavoriteLocations";

export default function HomePage() {
  const t = useTranslations();
  const { user } = useSession();

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {user?.username
            ? t("home.greetingNamed", { name: user.username })
            : t("home.greeting")}
        </h1>
        <p className="text-sm opacity-70">
          {t("home.summary", {
            email: user?.email ?? "",
            accountType: user ? t(`accountType.${user.accountType}`) : "",
            roles: user?.roles.join(", ") ?? "",
          })}
        </p>
      </section>

      <FavoriteLocations />
    </div>
  );
}
