"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Callout } from "@/components/ui/Callout";
import { Pagination } from "@/components/ui/Pagination";
import { pageCount } from "@/components/ui/pageRange";
import { ROUTES_PAGE_SIZE, listRoutes, routesQueryKey, type SavedRoute } from "./api";
import { DeleteRouteDialog } from "./DeleteRouteDialog";
import { EditRouteDialog } from "./EditRouteDialog";
import { RouteRow } from "./RouteRow";

export function RoutesPanel() {
  const t = useTranslations("routes");
  const tCommon = useTranslations("common");

  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<SavedRoute | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SavedRoute | null>(null);

  const query = useQuery({
    queryKey: routesQueryKey(page),
    queryFn: () => listRoutes(page),
    placeholderData: keepPreviousData,
  });

  const routes = query.data?.routes ?? [];
  const total = query.data?.pagination.total ?? 0;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">{t("title")}</h1>
          <p className="text-sm opacity-70">
            {query.isSuccess ? t("count", { count: total }) : t("subtitle")}
          </p>
        </div>

        <Link
          href="/map"
          className="ml-auto rounded-md border border-border px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
        >
          {t("planNew")}
        </Link>
      </div>

      {query.isPending && (
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

      {query.isSuccess && routes.length === 0 && (
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
              <p className="text-sm font-medium">{t("empty")}</p>
              <p className="mt-1 text-sm opacity-70">{t("emptyHint")}</p>
            </>
          )}
        </div>
      )}

      {routes.length > 0 && (
        <ul
          aria-busy={query.isPlaceholderData || undefined}
          className="divide-y divide-border rounded-lg border border-border"
        >
          {routes.map((route) => (
            <RouteRow
              key={route.id}
              route={route}
              onEdit={setEditing}
              onDelete={setPendingDelete}
            />
          ))}
        </ul>
      )}

      <Pagination
        page={page}
        totalPages={pageCount(total, ROUTES_PAGE_SIZE)}
        onPageChange={setPage}
        label={t("pagination")}
      />

      {editing && (
        <EditRouteDialog route={editing} onClose={() => setEditing(null)} />
      )}

      {pendingDelete && (
        <DeleteRouteDialog
          route={pendingDelete}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </section>
  );
}
