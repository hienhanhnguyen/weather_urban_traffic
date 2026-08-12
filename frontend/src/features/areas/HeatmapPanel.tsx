"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Callout } from "@/components/ui/Callout";
import type { AreaTally } from "@/features/incidents/api";
import {
  HEATMAP_QUERY_KEY,
  HEATMAP_REFRESH_MS,
  getHeatmap,
} from "./heatmap-api";
import { digest, sortByRisk } from "./heatmap";
import { AreaRiskDetail } from "./AreaRiskDetail";
import { ConditionCards } from "./ConditionCards";
import { RiskBadge, RiskLegend } from "./RiskBadge";

const HeatmapMap = dynamic(() => import("./HeatmapMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-surface" />,
});

export function HeatmapPanel({ tallies }: { tallies: AreaTally[] }) {
  const t = useTranslations("govHeatmap");
  const tCommon = useTranslations("common");

  const [selectedId, setSelectedId] = useState<number | null>(null);

  const query = useQuery({
    queryKey: HEATMAP_QUERY_KEY,
    queryFn: getHeatmap,
    refetchInterval: HEATMAP_REFRESH_MS,
  });

  const areas = query.data ?? [];
  const selected = areas.find((area) => area.id === selectedId) ?? null;
  const tallyOf = (areaId: number) =>
    tallies.find((tally) => tally.areaId === areaId) ?? null;

  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{t("title")}</h2>
          <p className="mt-1 text-sm opacity-70">{t("subtitle")}</p>
        </div>

        <RiskLegend />
      </header>

      {query.isError && <Callout tone="error">{t("loadFailed")}</Callout>}

      {query.isPending && (
        <p className="text-sm opacity-70">{tCommon("loading")}</p>
      )}

      {query.isSuccess && areas.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-6 text-sm opacity-70">
          {t("empty")}
        </p>
      )}

      {areas.length > 0 && <ConditionCards digest={digest(areas)} />}

      {areas.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div className="h-[28rem] overflow-hidden rounded-lg border border-border">
            <HeatmapMap
              areas={areas}
              tallies={tallies}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>

          <div className="flex max-h-[28rem] flex-col gap-3 overflow-y-auto">
            {selected ? (
              <AreaRiskDetail area={selected} tally={tallyOf(selected.id)} />
            ) : (
              <ul className="flex flex-col gap-2">
                {sortByRisk(areas).map((area) => (
                  <li key={area.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(area.id)}
                      className={
                        "flex w-full flex-wrap items-center justify-between " +
                        "gap-2 rounded-lg border border-border p-3 text-left " +
                        "hover:bg-black/5 dark:hover:bg-white/10"
                      }
                    >
                      <span className="text-sm font-medium">{area.name}</span>
                      <RiskBadge risk={area.risk} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {selected && (
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="self-start text-sm underline underline-offset-4"
              >
                {t("showAll")}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
