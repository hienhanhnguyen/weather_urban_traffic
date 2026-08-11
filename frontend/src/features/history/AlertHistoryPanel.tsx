"use client";

import { useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Pagination } from "@/components/ui/Pagination";
import { pageCount } from "@/components/ui/pageRange";
import {
  ALERT_EVENTS_QUERY_KEY,
  EVENTS_PAGE_SIZE,
  eventsQueryKey,
  listEvents,
  markAllEventsRead,
  markEventRead,
} from "@/features/notifications/api";
import { HistoryEventRow } from "./HistoryEventRow";
import { HistoryFilterBar } from "./HistoryFilterBar";
import {
  EMPTY_FILTERS,
  isFiltered,
  isRangeBackwards,
  toEventQuery,
  type HistoryFilters,
} from "./filters";

export function AlertHistoryPanel() {
  const t = useTranslations("history");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<HistoryFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const backwards = isRangeBackwards(filters);

  const query = useQuery({
    queryKey: eventsQueryKey(toEventQuery(filters, page)),
    queryFn: () => listEvents(toEventQuery(filters, page)),
    enabled: !backwards,
    placeholderData: keepPreviousData,
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ALERT_EVENTS_QUERY_KEY });

  const markOne = useMutation({ mutationFn: markEventRead, onSuccess: refresh });
  const markAll = useMutation({
    mutationFn: markAllEventsRead,
    onSuccess: refresh,
  });

  const changeFilters = (next: HistoryFilters) => {
    setFilters(next);
    setPage(1);
  };

  const events = query.data?.events ?? [];
  const total = query.data?.pagination.total ?? 0;
  const totalPages = pageCount(total, EVENTS_PAGE_SIZE);
  const busy = markOne.isPending || markAll.isPending;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <p className="min-w-0 text-sm opacity-70">
          {query.isSuccess ? t("count", { count: total }) : t("subtitle")}
        </p>

        <Button
          variant="secondary"
          className="ml-auto"
          onClick={() => markAll.mutate()}
          loading={markAll.isPending}
        >
          {t("markAllRead")}
        </Button>
      </div>

      <HistoryFilterBar
        filters={filters}
        onChange={changeFilters}
        onReset={() => changeFilters(EMPTY_FILTERS)}
        showReset={isFiltered(filters)}
        rangeError={backwards ? t("filters.rangeBackwards") : undefined}
      />

      {(markOne.isError || markAll.isError) && (
        <Callout tone="error">{t("markFailed")}</Callout>
      )}

      {query.isPending && !backwards && (
        <p className="text-sm opacity-70">{tCommon("loading")}</p>
      )}

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

      {query.isSuccess && events.length === 0 && (
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

      {events.length > 0 && (
        <ul
          aria-busy={query.isPlaceholderData || undefined}
          className="divide-y divide-border rounded-lg border border-border"
        >
          {events.map((event) => (
            <HistoryEventRow
              key={event.id}
              event={event}
              onMarkRead={markOne.mutate}
              disabled={busy}
            />
          ))}
        </ul>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        label={t("pagination")}
      />
    </div>
  );
}
