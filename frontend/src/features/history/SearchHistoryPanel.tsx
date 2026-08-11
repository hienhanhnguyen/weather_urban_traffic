"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Pagination } from "@/components/ui/Pagination";
import { DateRangeFields } from "./DateRangeFields";
import { isRangeSet } from "./filters";
import type { useSearchHistory } from "./useSearchHistory";

export interface SearchHistoryPanelProps<T> {
  namespace: "history.routes" | "history.weather";
  history: ReturnType<typeof useSearchHistory<T>>;
  renderRow: (item: T) => ReactNode;
}

export function SearchHistoryPanel<T extends { id: number }>({
  namespace,
  history,
  renderRow,
}: SearchHistoryPanelProps<T>) {
  const t = useTranslations(namespace);
  const tFilters = useTranslations("history.filters");
  const tCommon = useTranslations("common");

  const {
    range,
    changeRange,
    resetRange,
    page,
    setPage,
    backwards,
    query,
    clearAll,
    items,
    total,
    totalPages,
  } = history;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <p className="min-w-0 text-sm opacity-70">
          {query.isSuccess ? t("count", { count: total }) : t("subtitle")}
        </p>

        <Button
          variant="secondary"
          className="ml-auto"
          onClick={() => clearAll.mutate()}
          loading={clearAll.isPending}
          disabled={total === 0}
        >
          <Trash2 aria-hidden="true" className="size-4" />
          {t("clear")}
        </Button>
      </div>

      <div className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
        <DateRangeFields
          range={range}
          onChange={changeRange}
          rangeError={backwards ? tFilters("rangeBackwards") : undefined}
        />

        {isRangeSet(range) && (
          <button
            type="button"
            onClick={resetRange}
            className="justify-self-start text-sm underline underline-offset-4 sm:col-span-2"
          >
            {tCommon("clear")}
          </button>
        )}
      </div>

      {clearAll.isError && <Callout tone="error">{t("clearFailed")}</Callout>}

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

      {query.isSuccess && items.length === 0 && (
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
                {isRangeSet(range) ? t("emptyFiltered") : t("empty")}
              </p>
              <p className="mt-1 text-sm opacity-70">{t("emptyHint")}</p>
            </>
          )}
        </div>
      )}

      {items.length > 0 && (
        <ul
          aria-busy={query.isPlaceholderData || undefined}
          className="divide-y divide-border rounded-lg border border-border"
        >
          {items.map(renderRow)}
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
