"use client";

import { useMutation } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import type { BusinessReport } from "./api";
import { dayLabelDate } from "./format";
import {
  downloadReportPdf,
  type ReportPdfFormat,
  type ReportPdfText,
} from "./pdf";

export function ExportPdfButton({ report }: { report: BusinessReport | null }) {
  const t = useTranslations("businessReports");
  const tPdf = useTranslations("businessReports.pdf");
  const tColumns = useTranslations("businessReports.pdf.columns");
  const tRanges = useTranslations("businessReports.ranges");
  const tPoints = useTranslations("businessReports.points");
  const tKpi = useTranslations("businessReports.kpi");
  const tDetail = useTranslations("businessReports.kpi.detail");
  const tConditions = useTranslations("businessReports.conditions");
  const tMetrics = useTranslations("businessReports.metrics");
  const format = useFormatter();

  const text: ReportPdfText = {
    title: tPdf("title"),
    fields: {
      route: tPdf("fields.route"),
      period: tPdf("fields.period"),
      generatedAt: tPdf("fields.generatedAt"),
      timezone: tPdf("fields.timezone"),
    },
    sections: {
      points: tPdf("sections.points"),
      kpis: tPdf("sections.kpis"),
      conditions: tPdf("sections.conditions"),
      trend: tPdf("sections.trend"),
      timeline: tPdf("sections.timeline"),
    },
    columns: {
      points: [tColumns("role"), tColumns("address"), tColumns("coordinates")],
      kpis: [tColumns("metric"), tColumns("value"), tColumns("detail")],
      conditions: [tColumns("condition"), tColumns("hours"), tColumns("share")],
      timeline: [
        tColumns("time"),
        tColumns("temp"),
        tColumns("precip"),
        tColumns("humidity"),
        tColumns("wind"),
      ],
    },
    range: (range) => tRanges(range),
    role: (role) => tPoints(role),
    kpi: (key) => tKpi(key),
    kpiDetail: (key, value) => tDetail(key, { value }),
    condition: (group) => tConditions(group),
    metric: (metric) => tMetrics(metric),
    footer: tPdf("footer"),
    page: (page, total) => tPdf("page", { page, total }),
  };

  const pointLabel = (at: string) =>
    report?.range === "7d"
      ? format.dateTime(dayLabelDate(at), { day: "2-digit", month: "2-digit" })
      : format.dateTime(new Date(at), {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: report?.timezone,
        });

  const formatters: ReportPdfFormat = {
    timestamp: (iso) =>
      format.dateTime(new Date(iso), {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    point: pointLabel,
    share: (share) =>
      format.number(share, { style: "percent", maximumFractionDigits: 0 }),
  };

  const download = useMutation({
    mutationFn: (subject: BusinessReport) =>
      downloadReportPdf({ report: subject, text, format: formatters }),
  });

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        loading={download.isPending}
        disabled={!report}
        onClick={() => report && download.mutate(report)}
      >
        <FileDown aria-hidden="true" className="size-4" />
        {t("controls.pdf")}
      </Button>

      {download.isError && (
        <div className="basis-full">
          <Callout tone="error">{tPdf("failed")}</Callout>
        </div>
      )}
    </>
  );
}
