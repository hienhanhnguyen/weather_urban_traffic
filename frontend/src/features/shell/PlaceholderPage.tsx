"use client";

import { useTranslations } from "next-intl";
import { Construction } from "lucide-react";
import type { Messages } from "@/i18n/messages";

type PlaceholderKey = Exclude<keyof Messages["placeholder"], "notBuilt">;

export function PlaceholderPage({
  titleKey,
  descriptionKey,
}: {
  titleKey: keyof Messages["nav"]["items"];
  descriptionKey: PlaceholderKey;
}) {
  const nav = useTranslations("nav.items");
  const t = useTranslations("placeholder");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{nav(titleKey)}</h1>

      <div className="flex items-start gap-3 rounded-lg border border-dashed border-border p-6">
        <Construction aria-hidden="true" className="mt-0.5 size-5 opacity-60" />
        <div>
          <p className="text-sm font-medium">{t("notBuilt")}</p>
          <p className="mt-1 text-sm opacity-70">{t(descriptionKey)}</p>
        </div>
      </div>
    </div>
  );
}
