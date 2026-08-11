"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Bell, MapPin, Pencil, Trash2 } from "lucide-react";
import type { SavedLocation } from "./api";

export interface LocationRowProps {
  location: SavedLocation;
  ruleCount: number | null;
  onEdit: (location: SavedLocation) => void;
  onDelete: (location: SavedLocation) => void;
  onAlerts: (location: SavedLocation) => void;
}

export function LocationRow({
  location,
  ruleCount,
  onEdit,
  onDelete,
  onAlerts,
}: LocationRowProps) {
  const t = useTranslations("locations");

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <MapPin
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 opacity-60"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{location.name}</p>

        {location.address && (
          <p className="truncate text-xs opacity-70">{location.address}</p>
        )}

        <p className="text-xs opacity-50">
          {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Link
          href={`/map?lat=${location.latitude}&lng=${location.longitude}`}
          aria-label={t("openInMap", { name: location.name })}
          className="rounded-md p-2 hover:bg-black/5 dark:hover:bg-white/10"
        >
          <MapPin aria-hidden="true" className="size-4" />
        </Link>

        <button
          type="button"
          onClick={() => onAlerts(location)}
          aria-label={
            ruleCount
              ? t("alertsWithCount", { name: location.name, count: ruleCount })
              : t("alertsFor", { name: location.name })
          }
          className="relative rounded-md p-2 hover:bg-black/5 dark:hover:bg-white/10"
        >
          <Bell aria-hidden="true" className="size-4" />

          {ruleCount !== null && ruleCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute top-0.5 right-0.5 min-w-4 rounded-full bg-sky-600 px-1 text-[10px] leading-4 font-medium text-white"
            >
              {ruleCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onEdit(location)}
          aria-label={t("editOne", { name: location.name })}
          className="rounded-md p-2 hover:bg-black/5 dark:hover:bg-white/10"
        >
          <Pencil aria-hidden="true" className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => onDelete(location)}
          aria-label={t("deleteOne", { name: location.name })}
          className="rounded-md p-2 text-red-600 hover:bg-red-600/10 dark:text-red-400"
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </button>
      </div>
    </li>
  );
}
