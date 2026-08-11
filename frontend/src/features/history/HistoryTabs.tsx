"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertHistoryPanel } from "./AlertHistoryPanel";
import { RouteSearchHistory } from "./RouteSearchHistory";
import { WeatherSearchHistory } from "./WeatherSearchHistory";

const TABS = ["alerts", "routes", "weather"] as const;

type Tab = (typeof TABS)[number];

export function HistoryTabs() {
  const t = useTranslations("history");

  const [tab, setTab] = useState<Tab>("alerts");
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    const step =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;

    if (step === 0) return;
    event.preventDefault();

    const next = (TABS.indexOf(tab) + step + TABS.length) % TABS.length;
    setTab(TABS[next]);
    tabsRef.current[next]?.focus();
  };

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">{t("title")}</h1>

      <div
        role="tablist"
        aria-label={t("title")}
        onKeyDown={onKeyDown}
        className="flex gap-1 border-b border-border"
      >
        {TABS.map((value, index) => (
          <button
            key={value}
            ref={(node) => {
              tabsRef.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`history-tab-${value}`}
            aria-selected={value === tab}
            aria-controls={`history-panel-${value}`}
            tabIndex={value === tab ? 0 : -1}
            onClick={() => setTab(value)}
            className={
              "-mb-px border-b-2 px-3 py-2 text-sm " +
              (value === tab
                ? "border-sky-600 font-medium"
                : "border-transparent opacity-70 hover:opacity-100")
            }
          >
            {t(`tabs.${value}`)}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`history-panel-${tab}`}
        aria-labelledby={`history-tab-${tab}`}
        tabIndex={0}
      >
        {tab === "alerts" && <AlertHistoryPanel />}
        {tab === "routes" && <RouteSearchHistory />}
        {tab === "weather" && <WeatherSearchHistory />}
      </div>
    </section>
  );
}
