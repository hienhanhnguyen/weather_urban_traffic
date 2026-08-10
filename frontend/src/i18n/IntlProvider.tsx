"use client";

import { Suspense, use, useEffect, useSyncExternalStore } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getServerLocale, subscribe } from "./locale";
import { loadMessages } from "./messages";
import { FullPageSpinner } from "@/components/ui/FullPageSpinner";

function Translated({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getLocale, getServerLocale);
  const messages = use(loadMessages(locale));

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone="Asia/Ho_Chi_Minh"
    >
      {children}
    </NextIntlClientProvider>
  );
}

export function IntlProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Translated>{children}</Translated>
    </Suspense>
  );
}
