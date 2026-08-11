"use client";

import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { Map } from "lucide-react";
import { useRouteFormat } from "@/features/map/format";
import { mapHrefFor } from "@/features/map/link";
import { RouteLegs } from "@/features/routes/RouteLegs";
import type { RouteSearchEntry } from "./api";

export function RouteSearchRow({ search }: { search: RouteSearchEntry }) {
  const t = useTranslations("history.routes");
  const tProfiles = useTranslations("map.route.profiles");
  const format = useFormatter();
  const routeFormat = useRouteFormat();

  const searchedAt = new Date(search.searchedAt);
  const label = search.end.address || search.start.address || "";

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <RouteLegs start={search.start} end={search.end} />

        <p className="mt-1 flex flex-wrap gap-x-3 text-xs opacity-50">
          <span>{tProfiles(search.profile)}</span>
          <span className="tabular-nums">
            {routeFormat.distance(search.distanceM)}
          </span>
          <span className="tabular-nums">
            {routeFormat.duration(search.durationS)}
          </span>
        </p>

        <p className="text-xs opacity-50">
          <time dateTime={search.searchedAt}>
            {format.dateTime(searchedAt, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </time>
          {" · "}
          {format.relativeTime(searchedAt)}
        </p>
      </div>

      <Link
        href={mapHrefFor(search)}
        aria-label={t("reopen", { label })}
        className="shrink-0 rounded-md p-2 hover:bg-black/5 dark:hover:bg-white/10"
      >
        <Map aria-hidden="true" className="size-4" />
      </Link>
    </li>
  );
}
