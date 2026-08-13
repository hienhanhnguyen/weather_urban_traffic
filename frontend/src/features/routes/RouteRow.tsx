"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Map, Pencil, Trash2 } from "lucide-react";
import { useRouteFormat } from "@/features/map/format";
import { mapHrefFor } from "@/features/map/link";
import { RouteLegs } from "./RouteLegs";
import type { SavedRoute } from "./api";

export interface RouteRowProps {
  route: SavedRoute;
  onEdit: (route: SavedRoute) => void;
  onDelete: (route: SavedRoute) => void;
}

export function RouteRow({ route, onEdit, onDelete }: RouteRowProps) {
  const t = useTranslations("routes");
  const tProfiles = useTranslations("map.route.profiles");
  const format = useRouteFormat();

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{route.name}</p>

        <RouteLegs start={route.start} end={route.end} />

        <p className="mt-1 flex flex-wrap gap-x-3 text-xs opacity-50">
          <span>{tProfiles(route.profile)}</span>
          <span className="tabular-nums">{format.distance(route.distanceM)}</span>
          <span className="tabular-nums">{format.duration(route.durationS)}</span>
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Link
          href={mapHrefFor(route)}
          aria-label={t("openInMap", { name: route.name })}
          className="rounded-md p-2 hover:bg-black/5 dark:hover:bg-white/10"
        >
          <Map aria-hidden="true" className="size-4" />
        </Link>

        <button
          type="button"
          onClick={() => onEdit(route)}
          aria-label={t("editOne", { name: route.name })}
          className="rounded-md p-2 hover:bg-black/5 dark:hover:bg-white/10"
        >
          <Pencil aria-hidden="true" className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => onDelete(route)}
          aria-label={t("deleteOne", { name: route.name })}
          className="rounded-md p-2 text-red-600 hover:bg-red-600/10 dark:text-red-400"
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </button>
      </div>
    </li>
  );
}
