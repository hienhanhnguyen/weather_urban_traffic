"use client";

import { useFormatter } from "next-intl";
import { useRelativeTime } from "@/i18n/relative-time";
import type { Incident } from "./api";
import { SeverityBadge, StatusBadge } from "./StatusBadge";

export interface IncidentRowProps {
  incident: Incident;
  selected: boolean;
  onSelect: (incident: Incident) => void;
}

export function IncidentRow({ incident, selected, onSelect }: IncidentRowProps) {
  const format = useFormatter();
  const relativeTime = useRelativeTime();

  const createdAt = new Date(incident.createdAt);

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(incident)}
        aria-current={selected ? "true" : undefined}
        className={
          "flex w-full flex-col gap-1 px-4 py-3 text-left " +
          (selected ? "bg-sky-500/10" : "hover:bg-black/5 dark:hover:bg-white/5")
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status} />
          {incident.areaName && (
            <span className="text-xs opacity-70">{incident.areaName}</span>
          )}
        </div>

        <p className={"text-sm " + (incident.isRead ? "" : "font-semibold")}>
          {incident.title}
        </p>

        <p className="text-xs opacity-50">
          <time dateTime={incident.createdAt}>
            {format.dateTime(createdAt, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </time>
          {" · "}
          {relativeTime(createdAt)}
        </p>
      </button>
    </li>
  );
}
