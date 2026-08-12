"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Callout } from "@/components/ui/Callout";
import { Select } from "@/components/ui/Select";
import { HeatmapPanel } from "@/features/areas/HeatmapPanel";
import { AreaTallyTable } from "./AreaTallyTable";
import { KpiCards } from "./KpiCards";
import {
  getIncidentSummary,
  incidentSummaryQueryKey,
} from "./api";
import {
  DEFAULT_FILTERS,
  TIMEFRAMES,
  toSummaryQuery,
  type Timeframe,
} from "./filters";

export function DashboardPanel() {
  const t = useTranslations("govDashboard");
  const tIncidents = useTranslations("govIncidents");
  const tCommon = useTranslations("common");

  const [timeframe, setTimeframe] = useState<Timeframe>(
    DEFAULT_FILTERS.timeframe,
  );

  const filters = { ...DEFAULT_FILTERS, timeframe };
  const query = useQuery({
    queryKey: incidentSummaryQueryKey(toSummaryQuery(filters)),
    queryFn: () => getIncidentSummary(toSummaryQuery(filters)),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="mt-1 text-sm opacity-70">{t("subtitle")}</p>
        </div>

        <Select
          label={t("window")}
          value={timeframe}
          onChange={(event) => setTimeframe(event.target.value as Timeframe)}
          options={TIMEFRAMES.map((value) => ({
            value,
            label: tIncidents(`timeframes.${value}`),
          }))}
        />
      </header>

      {query.isError && <Callout tone="error">{t("loadFailed")}</Callout>}

      {query.isPending && <p className="text-sm opacity-70">{tCommon("loading")}</p>}

      {query.data && (
        <>
          <KpiCards summary={query.data} />

          {query.data.areas.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6">
              <p className="text-sm font-medium">{t("noAreas")}</p>
              <Link
                href="/gov/areas"
                className="mt-1 inline-flex items-center gap-1 text-sm underline underline-offset-4"
              >
                {t("noAreasAction")}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          ) : (
            <>
              <HeatmapPanel tallies={query.data.areas} />
              <AreaTallyTable areas={query.data.areas} />
            </>
          )}

          <Link
            href="/gov/incidents"
            className="inline-flex items-center gap-1 self-start text-sm underline underline-offset-4"
          >
            {t("openIncidents")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </>
      )}
    </div>
  );
}
