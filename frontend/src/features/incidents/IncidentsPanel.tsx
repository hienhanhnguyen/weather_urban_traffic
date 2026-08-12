"use client";

import { useState } from "react";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Callout } from "@/components/ui/Callout";
import { Pagination } from "@/components/ui/Pagination";
import { pageCount } from "@/components/ui/pageRange";
import { AREAS_QUERY_KEY, listAreas } from "@/features/areas/api";
import {
  ALERT_EVENTS_QUERY_KEY,
  UNREAD_COUNT_QUERY_KEY,
} from "@/features/notifications/api";
import {
  INCIDENTS_PAGE_SIZE,
  INCIDENTS_QUERY_KEY,
  incidentsQueryKey,
  listIncidents,
} from "./api";
import { IncidentDetail } from "./IncidentDetail";
import { IncidentFilterBar } from "./IncidentFilterBar";
import { IncidentRow } from "./IncidentRow";
import {
  DEFAULT_FILTERS,
  isFiltered,
  toIncidentQuery,
  type IncidentFilters,
} from "./filters";

export function IncidentsPanel() {
  const t = useTranslations("govIncidents");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<IncidentFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const areas = useQuery({ queryKey: AREAS_QUERY_KEY, queryFn: listAreas });

  const query = useQuery({
    queryKey: incidentsQueryKey(toIncidentQuery(filters, page)),
    queryFn: () => listIncidents(toIncidentQuery(filters, page)),
    placeholderData: keepPreviousData,
  });

  const incidents = query.data?.incidents ?? [];
  const total = query.data?.pagination.total ?? 0;

  const selected = incidents.find((incident) => incident.id === selectedId);

  const changeFilters = (next: IncidentFilters) => {
    setFilters(next);
    setPage(1);
  };

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: INCIDENTS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ALERT_EVENTS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY }),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm opacity-70">
          {query.isSuccess ? t("count", { count: total }) : t("subtitle")}
        </p>
      </header>

      <IncidentFilterBar
        filters={filters}
        areas={areas.data ?? []}
        onChange={changeFilters}
        onReset={() => changeFilters(DEFAULT_FILTERS)}
        showReset={isFiltered(filters)}
      />

      {query.isError && (
        <Callout tone="error">
          {t("loadFailed")}{" "}
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="underline underline-offset-4"
          >
            {tCommon("tryAgain")}
          </button>
        </Callout>
      )}

      {query.isPending && (
        <p className="text-sm opacity-70">{tCommon("loading")}</p>
      )}

      {query.isSuccess && incidents.length === 0 && (
        <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
          {page > 1 ? (
            <>
              <p className="text-sm font-medium">{t("pageGone")}</p>
              <button
                type="button"
                onClick={() => setPage(1)}
                className="mt-1 text-sm underline underline-offset-4"
              >
                {t("firstPage")}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">
                {isFiltered(filters) ? t("emptyFiltered") : t("empty")}
              </p>
              <p className="mt-1 text-sm opacity-70">{t("emptyHint")}</p>
            </>
          )}
        </div>
      )}

      {incidents.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          <div className="flex flex-col gap-4">
            <ul
              aria-busy={query.isPlaceholderData || undefined}
              className="divide-y divide-border overflow-hidden rounded-lg border border-border"
            >
              {incidents.map((incident) => (
                <IncidentRow
                  key={incident.id}
                  incident={incident}
                  selected={incident.id === selectedId}
                  onSelect={() => setSelectedId(incident.id)}
                />
              ))}
            </ul>

            <Pagination
              page={page}
              totalPages={pageCount(total, INCIDENTS_PAGE_SIZE)}
              onPageChange={setPage}
              label={t("pagination")}
            />
          </div>

          {selected ? (
            <IncidentDetail
              key={selected.id}
              incident={selected}
              onUpdated={() => void refresh()}
            />
          ) : (
            <p className="rounded-lg border border-dashed border-border p-6 text-sm opacity-70">
              {t("detail.noSelection")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
