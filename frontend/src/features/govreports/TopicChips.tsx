"use client";

import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import type { ReportTopic } from "./api";
import { REPORT_TOPICS, toggleTopic } from "./report";

export function TopicChips({
  topics,
  onChange,
  label,
}: {
  topics: ReportTopic[];
  onChange: (topics: ReportTopic[]) => void;
  label: string;
}) {
  const t = useTranslations("govReports.topics");

  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-wrap items-center gap-2"
    >
      {REPORT_TOPICS.map((topic) => {
        const on = topics.includes(topic);

        return (
          <button
            key={topic}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(toggleTopic(topics, topic))}
            className={
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm " +
              (on
                ? "border-sky-600 bg-sky-500/10"
                : "border-border opacity-70 hover:opacity-100")
            }
          >
            {on && <Check aria-hidden="true" className="size-3.5" />}
            {t(topic)}
          </button>
        );
      })}
    </div>
  );
}
