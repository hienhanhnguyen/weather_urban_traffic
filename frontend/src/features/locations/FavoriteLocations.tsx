"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LOCATIONS_QUERY_KEY, listLocations } from "./api";
import { LocationFormModal } from "./LocationFormModal";

const PREVIEW_COUNT = 3;

export function FavoriteLocations() {
  const t = useTranslations("locations");
  const tCommon = useTranslations("common");

  const [adding, setAdding] = useState(false);

  const query = useQuery({
    queryKey: LOCATIONS_QUERY_KEY,
    queryFn: listLocations,
  });

  const locations = query.data?.locations ?? [];
  const total = query.data?.pagination.total ?? 0;

  return (
    <section className="rounded-lg border border-border p-4">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold">{t("favoritesTitle")}</h2>

        <Button
          variant="secondary"
          className="ml-auto px-3 py-1.5 text-xs"
          onClick={() => setAdding(true)}
        >
          <Plus aria-hidden="true" className="size-3.5" />
          {t("add")}
        </Button>
      </div>

      {query.isPending && (
        <p className="mt-3 text-sm opacity-70">{tCommon("loading")}</p>
      )}

      {query.isError && (
        <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">
          {t("loadFailed")}
        </p>
      )}

      {query.isSuccess && locations.length === 0 && (
        <p className="mt-3 text-sm opacity-70">{t("empty")}</p>
      )}

      {locations.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {locations.slice(0, PREVIEW_COUNT).map((location) => (
            <li key={location.id} className="flex items-start gap-2">
              <MapPin
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 opacity-60"
              />
              <span className="min-w-0">
                <span className="block truncate text-sm">{location.name}</span>
                {location.address && (
                  <span className="block truncate text-xs opacity-60">
                    {location.address}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {total > PREVIEW_COUNT && (
        <Link
          href="/locations"
          className="mt-3 inline-block text-xs underline-offset-4 hover:underline"
        >
          {t("showAll", { count: total })}
        </Link>
      )}

      {adding && (
        <LocationFormModal location={null} onClose={() => setAdding(false)} />
      )}
    </section>
  );
}
