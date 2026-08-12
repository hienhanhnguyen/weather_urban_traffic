"use client";

import { useMutation } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import type { GovReport, ReportTopic } from "./api";
import { dayDate, isAreaMetric } from "./report";
import { useDurationLabel } from "./ReportKpis";
import {
  downloadGovReportPdf,
  type GovReportPdfFormat,
  type GovReportPdfText,
} from "./pdf";

export function ExportGovReportButton({
  report,
  topics,
  areaName,
}: {
  report: GovReport | null;
  topics: ReportTopic[];
  areaName: string | null;
}) {
  const t = useTranslations("govReports");
  const tPdf = useTranslations("govReports.pdf");
  const tColumns = useTranslations("govReports.pdf.columns");
  const tOverview = useTranslations("govReports.overview");
  const tMetrics = useTranslations("areaAlerts.metrics");
  const tMeasurements = useTranslations("govReports.measurements");
  const tSeverity = useTranslations("notifications.severities");
  const tStatus = useTranslations("govIncidents.statuses");
  const tAreas = useTranslations("govDashboard.areas");
  const format = useFormatter();
  const durationLabel = useDurationLabel();

  const text: GovReportPdfText = {
    title: tPdf("title"),
    fields: {
      period: tPdf("fields.period"),
      area: tPdf("fields.area"),
      generatedAt: tPdf("fields.generatedAt"),
      timezone: tPdf("fields.timezone"),
    },
    sections: {
      overview: tPdf("sections.overview"),
      trend: tPdf("sections.trend"),
      areas: tPdf("sections.areas"),
      metrics: tPdf("sections.metrics"),
      incidents: tPdf("sections.incidents"),
      scenarios: tPdf("sections.scenarios"),
    },
    columns: {
      overview: [tColumns("figure"), tColumns("value")],
      areas: [
        tColumns("area"),
        tColumns("total"),
        tColumns("pending"),
        tColumns("worst"),
        tColumns("last"),
      ],
      metrics: [tColumns("metric"), tColumns("total"), tColumns("share")],
      incidents: [
        tColumns("time"),
        tColumns("area"),
        tColumns("incident"),
        tColumns("severity"),
        tColumns("status"),
        tColumns("plan"),
      ],
      scenarios: [tColumns("plan"), tColumns("activations")],
    },
    overview: (key) => tOverview(key),
    metric: (metric) =>
      isAreaMetric(metric) ? tMetrics(metric) : tMeasurements("otherMetric"),
    severity: (severity) => tSeverity(severity),
    status: (status) => tStatus(status),
    quiet: tAreas("quiet"),
    noPlan: tPdf("noPlan"),
    allAreas: tPdf("allAreas"),
    truncated: tPdf("truncated"),
    footer: tPdf("footer"),
    page: (page, total) => tPdf("page", { page, total }),
  };

  const formatters: GovReportPdfFormat = {
    timestamp: (isoDate) =>
      format.dateTime(new Date(isoDate), {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    day: (day) =>
      format.dateTime(dayDate(day), { day: "2-digit", month: "2-digit" }),
    share: (share) =>
      format.number(share, { style: "percent", maximumFractionDigits: 0 }),
    duration: durationLabel,
    number: (value) => format.number(value),
  };

  const download = useMutation({
    mutationFn: (subject: GovReport) =>
      downloadGovReportPdf({
        report: subject,
        topics,
        areaName,
        text,
        format: formatters,
      }),
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
