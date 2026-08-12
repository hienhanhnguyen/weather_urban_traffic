"use client";

import { useTranslations } from "next-intl";

export function SkipLink() {
  const t = useTranslations("nav");

  return (
    <a
      href="#main-content"
      className={
        "sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 " +
        "focus:rounded-md focus:bg-sky-600 focus:px-4 focus:py-2 focus:text-sm " +
        "focus:font-medium focus:text-white"
      }
    >
      {t("skipToContent")}
    </a>
  );
}
