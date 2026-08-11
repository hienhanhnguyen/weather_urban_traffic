"use client";

import { useTranslations } from "next-intl";
import { CircleDot, MapPin } from "lucide-react";
import type { RouteEndpoint } from "./api";

const coordinates = (endpoint: RouteEndpoint) =>
  `${endpoint.latitude.toFixed(5)}, ${endpoint.longitude.toFixed(5)}`;

/** The from/to pair, shown the same way wherever a route appears. */
export function RouteLegs({
  start,
  end,
}: {
  start: RouteEndpoint;
  end: RouteEndpoint;
}) {
  const t = useTranslations("routes");

  return (
    <dl className="mt-1 flex flex-col gap-0.5 text-xs opacity-70">
      <div className="flex min-w-0 items-center gap-1.5">
        <dt className="shrink-0">
          <CircleDot aria-hidden="true" className="size-3.5" />
          <span className="sr-only">{t("form.from")}</span>
        </dt>
        <dd className="truncate">{start.address || coordinates(start)}</dd>
      </div>

      <div className="flex min-w-0 items-center gap-1.5">
        <dt className="shrink-0">
          <MapPin aria-hidden="true" className="size-3.5" />
          <span className="sr-only">{t("form.to")}</span>
        </dt>
        <dd className="truncate">{end.address || coordinates(end)}</dd>
      </div>
    </dl>
  );
}
