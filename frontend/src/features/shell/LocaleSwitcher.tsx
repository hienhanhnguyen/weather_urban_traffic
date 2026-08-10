"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Languages } from "lucide-react";
import { LOCALES, isLocale, type Locale } from "@/i18n/config";
import {
  getLocale,
  getServerLocale,
  setLocale,
  subscribe,
} from "@/i18n/locale";
import { useSession } from "@/lib/auth/session";
import {
  PREFERENCES_QUERY_KEY,
  updatePreferences,
  type Preferences,
} from "@/features/account/api";

export function LocaleSwitcher() {
  const t = useTranslations("locale");
  const { status } = useSession();
  const queryClient = useQueryClient();
  const locale = useSyncExternalStore(subscribe, getLocale, getServerLocale);

  const persist = useMutation({
    mutationFn: (language: Locale) => updatePreferences({ language }),
    onSuccess: (preferences) =>
      queryClient.setQueryData<Preferences>(PREFERENCES_QUERY_KEY, preferences),
  });

  const onChange = (value: string) => {
    if (!isLocale(value)) return;

    setLocale(value);

    if (status === "authenticated") persist.mutate(value);
  };

  return (
    <label className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-sm">
      <Languages aria-hidden="true" className="size-4 opacity-60" />
      <span className="sr-only">{t("label")}</span>
      <select
        value={locale}
        onChange={(event) => onChange(event.target.value)}
        className="bg-transparent outline-none focus-visible:underline"
      >
        {LOCALES.map((value) => (
          <option key={value} value={value}>
            {t(value)}
          </option>
        ))}
      </select>
    </label>
  );
}
