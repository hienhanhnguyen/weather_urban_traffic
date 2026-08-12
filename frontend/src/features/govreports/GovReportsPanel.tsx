"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Select } from "@/components/ui/Select";
import { isApiError } from "@/lib/api/errors";
import { AREAS_QUERY_KEY, listAreas } from "@/features/areas/api";
import { AreaTallyTable } from "@/features/incidents/AreaTallyTable";
import {
  ALL_AREAS,
  areaSelectValue,
  parseAreaId,
  type Timeframe,
} from "@/features/incidents/filters";
import {
  emailGovReport,
  getGovReport,
  govReportQueryKey,
  type ReportTopic,
} from "./api";
import {
  DEFAULT_REPORT_FILTERS,
  REPORT_TIMEFRAMES,
  REPORT_TOPICS,
  toReportQuery,
  type ReportFilters,
} from "./report";
import { MeasurementTable, PlanUsageTable } from "./BreakdownTables";
import { ExportGovReportButton } from "./ExportGovReportButton";
import { GovScheduleEditor } from "./GovScheduleEditor";
import { IncidentTrendChart } from "./IncidentTrendChart";
import { ReportKpis } from "./ReportKpis";
import { TopicChips } from "./TopicChips";

const STALE_TIME = 5 * 60 * 1000;

export function GovReportsPanel() {
  const t = useTranslations("govReports");
  const tRanges = useTranslations("govReports.ranges");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const format = useFormatter();

  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_REPORT_FILTERS);
  const [topics, setTopics] = useState<ReportTopic[]>([...REPORT_TOPICS]);

  const areas = useQuery({ queryKey: AREAS_QUERY_KEY, queryFn: listAreas });

  const query = toReportQuery(filters);

  const report = useQuery({
    queryKey: govReportQueryKey(query),
    queryFn: () => getGovReport(query),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME,
  });

  const mail = useMutation({
    mutationFn: () => emailGovReport({ ...query, topics }),
  });

  const change = (patch: Partial<ReportFilters>) => {
    mail.reset();
    setFilters((previous) => ({ ...previous, ...patch }));
  };

  const data = report.data;

  const areaName =
    areas.data?.find((area) => area.id === filters.areaId)?.name ?? null;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm opacity-70">{t("subtitle")}</p>
      </header>

      <div className="flex flex-wrap items-end gap-4">
        <Select
          label={t("controls.window")}
          value={filters.timeframe}
          onChange={(event) =>
            change({ timeframe: event.target.value as Timeframe })
          }
          options={REPORT_TIMEFRAMES.map((value) => ({
            value,
            label: tRanges(value),
          }))}
        />

        <Select
          label={t("controls.area")}
          value={areaSelectValue(filters.areaId)}
          onChange={(event) =>
            change({ areaId: parseAreaId(event.target.value) })
          }
          options={[
            { value: ALL_AREAS, label: t("controls.allAreas") },
            ...(areas.data ?? []).map((area) => ({
              value: String(area.id),
              label: area.name,
            })),
          ]}
        />

        <Button
          type="button"
          variant="secondary"
          loading={mail.isPending}
          disabled={!data}
          onClick={() => mail.mutate()}
        >
          <Mail aria-hidden="true" className="size-4" />
          {t("controls.email")}
        </Button>

        <ExportGovReportButton
          report={data ?? null}
          topics={topics}
          areaName={areaName}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">{t("controls.topics")}</p>
        <TopicChips
          topics={topics}
          onChange={setTopics}
          label={t("controls.topics")}
        />
        <p className="text-sm opacity-70">{t("controls.topicsHint")}</p>
      </div>

      {mail.isSuccess && (
        <Callout tone="success">
          {t("emailed", { address: mail.data.sentTo })}
        </Callout>
      )}

      {mail.isError && (
        <Callout tone="error">
          {isApiError(mail.error) ? mail.error.message : tErrors("generic")}
        </Callout>
      )}

      {report.isPending && (
        <p className="text-sm opacity-70">{tCommon("loading")}</p>
      )}

      {report.isError && (
        <Callout tone="error">
          {t("loadFailed")}{" "}
          <button
            type="button"
            onClick={() => void report.refetch()}
            className="underline underline-offset-4"
          >
            {tCommon("tryAgain")}
          </button>
        </Callout>
      )}

      {data && (
        <div
          aria-busy={report.isPlaceholderData || undefined}
          className="flex flex-col gap-6"
        >
          <p className="text-sm opacity-70">
            {t("generatedAt", {
              at: format.dateTime(new Date(data.generatedAt), {
                dateStyle: "medium",
                timeStyle: "short",
              }),
            })}
          </p>

          {data.truncated && <Callout tone="info">{t("truncated")}</Callout>}

          {data.summary.areasManaged === 0 && (
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
          )}

          <ReportKpis report={data} />

          {data.daily.length > 0 && <IncidentTrendChart daily={data.daily} />}

          {topics.includes("areas") && data.areas.length > 0 && (
            <AreaTallyTable areas={data.areas} />
          )}

          {topics.includes("incidents") && (
            <>
              <MeasurementTable report={data} />

              <Link
                href="/gov/incidents"
                className="inline-flex items-center gap-1 self-start text-sm underline underline-offset-4"
              >
                {t("openIncidents")}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </>
          )}

          {topics.includes("scenarios") && <PlanUsageTable report={data} />}
        </div>
      )}

      <GovScheduleEditor />
    </div>
  );
}
