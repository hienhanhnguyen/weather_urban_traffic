"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { setLocale } from "@/i18n/locale";
import { getPreferences, PREFERENCES_QUERY_KEY } from "@/features/account/api";

export function LocaleSync() {
  const { data } = useQuery({
    queryKey: PREFERENCES_QUERY_KEY,
    queryFn: getPreferences,
    staleTime: 5 * 60_000,
  });

  const language = data?.language;

  useEffect(() => {
    if (language) setLocale(language);
  }, [language]);

  return null;
}
