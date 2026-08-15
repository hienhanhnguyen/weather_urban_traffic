"use client";

import { useTranslations } from "next-intl";
import { useSession } from "@/lib/auth/session";
import { FavoriteLocations } from "@/features/locations/FavoriteLocations";

export default function HomePage() {
  const t = useTranslations("home");
  const { user } = useSession();

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {user?.username
            ? t("greetingNamed", { name: user.username })
            : t("greeting")}
        </h1>
        <p className="text-sm opacity-70">{t("subtitle")}</p>
      </section>

      <FavoriteLocations />
    </div>
  );
}
