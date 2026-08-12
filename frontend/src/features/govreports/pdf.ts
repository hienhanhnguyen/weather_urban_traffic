import type { ChartInput } from "@/lib/pdf/chart";
import type { AlertSeverity } from "@/features/notifications/api";
import type { IncidentStatus } from "@/features/incidents/api";
import type { GovReport, ReportTopic } from "./api";
import { SEVERITY_COLORS } from "./report";

const NO_VALUE = "—";

export type OverviewKey =
  | "total"
  | "critical"
  | "warning"
  | "info"
  | "pending"
  | "handled"
  | "averageResponse"
  | "slowestResponse"
  | "areasAffected";

export interface GovReportPdfText {
  title: string;
  fields: {
    period: string;
    area: string;
    generatedAt: string;
    timezone: string;
  };
  sections: {
    overview: string;
    trend: string;
    areas: string;
    metrics: string;
    incidents: string;
    scenarios: string;
  };
  columns: {
    overview: string[];
    areas: string[];
    metrics: string[];
    incidents: string[];
    scenarios: string[];
  };
  overview: (key: OverviewKey) => string;
  metric: (metric: string) => string;
  severity: (severity: AlertSeverity) => string;
  status: (status: IncidentStatus) => string;
  quiet: string;
  noPlan: string;
  allAreas: string;
  truncated: string;
  footer: string;
  page: (page: number, total: number) => string;
}

export interface GovReportPdfFormat {
  timestamp: (iso: string) => string;
  day: (day: string) => string;
  share: (share: number) => string;
  duration: (minutes: number | null) => string;
  number: (value: number) => string;
}

export interface GovReportPdfInput {
  report: GovReport;
  topics: ReportTopic[];
  areaName: string | null;
  text: GovReportPdfText;
  format: GovReportPdfFormat;
}

const periodLabel = ({ report, format }: GovReportPdfInput) => {
  const { from, to } = report.range;

  if (from === null && to === null) return NO_VALUE;

  return [from, to ?? report.generatedAt]
    .map((at) => (at === null ? NO_VALUE : format.timestamp(at)))
    .join(" – ");
};

export function summaryRows(input: GovReportPdfInput): [string, string][] {
  const { report, text, format, areaName } = input;

  return [
    [text.fields.period, periodLabel(input)],
    [text.fields.area, areaName ?? text.allAreas],
    [text.fields.generatedAt, format.timestamp(report.generatedAt)],
    [text.fields.timezone, report.timezone],
  ];
}

export function overviewRows({
  report,
  text,
  format,
}: GovReportPdfInput): string[][] {
  const { summary, response } = report;

  const entries: [OverviewKey, string][] = [
    ["total", format.number(summary.total)],
    ["critical", format.number(summary.bySeverity.critical)],
    ["warning", format.number(summary.bySeverity.warning)],
    ["info", format.number(summary.bySeverity.info)],
    ["pending", format.number(response.pending)],
    ["handled", `${format.number(response.handled)} (${format.share(response.handledShare)})`],
    ["averageResponse", format.duration(response.averageMinutes)],
    ["slowestResponse", format.duration(response.slowestMinutes)],
    [
      "areasAffected",
      `${format.number(summary.areasAffected)} / ${format.number(summary.areasManaged)}`,
    ],
  ];

  return entries.map(([key, value]) => [text.overview(key), value]);
}

export function areaRows({
  report,
  text,
  format,
}: GovReportPdfInput): string[][] {
  return report.areas.map((area) => [
    area.name,
    format.number(area.total),
    format.number(area.pending),
    area.worstSeverity ? text.severity(area.worstSeverity) : text.quiet,
    area.lastAt === null ? NO_VALUE : format.timestamp(area.lastAt),
  ]);
}

export function metricRows({
  report,
  text,
  format,
}: GovReportPdfInput): string[][] {
  const total = report.summary.total;

  return report.metrics.map((row) => [
    text.metric(row.metric),
    format.number(row.count),
    total === 0 ? NO_VALUE : format.share(row.count / total),
  ]);
}

export function scenarioRows({
  report,
  format,
}: GovReportPdfInput): string[][] {
  return report.scenarios.rows
    .filter((row) => row.activations > 0)
    .map((row) => [row.name, format.number(row.activations)]);
}

export function incidentRows({
  report,
  text,
  format,
}: GovReportPdfInput): string[][] {
  return report.recent.map((incident) => [
    format.timestamp(incident.createdAt),
    incident.areaName ?? NO_VALUE,
    incident.title,
    text.severity(incident.severity),
    text.status(incident.status),
    incident.scenarioName ?? text.noPlan,
  ]);
}

export function chartInput({
  report,
  format,
}: GovReportPdfInput): ChartInput {
  return {
    values: report.daily.map((row) => row.total),
    labels: report.daily.map((row) => format.day(row.day)),
    unit: "",
    color: SEVERITY_COLORS.warning,
    kind: "bar",
  };
}

export function fileSlug(report: GovReport): string {
  const day = report.generatedAt.slice(0, 10);
  const window = report.range.timeframe ?? "custom";

  return `area-report-${window}-${day}.pdf`;
}

const CHART_HEIGHT = 46;

export async function createGovReportPdf(input: GovReportPdfInput) {
  const { PdfDocument } = await import("@/lib/pdf/document");
  const { drawChart } = await import("@/lib/pdf/chart");

  const { text, topics, report } = input;

  const pdf = await PdfDocument.create({ title: text.title });

  pdf.title(text.title);
  pdf.keyValues(summaryRows(input));

  if (report.truncated) pdf.paragraph(text.truncated);

  pdf.heading(text.sections.overview);
  pdf.table({
    head: text.columns.overview,
    rows: overviewRows(input),
    weights: [2, 1],
  });

  if (report.daily.length > 0) {
    pdf.heading(text.sections.trend);
    drawChart(pdf.doc, pdf.reserve(CHART_HEIGHT), chartInput(input));
  }

  if (topics.includes("areas") && report.areas.length > 0) {
    pdf.heading(text.sections.areas);
    pdf.table({
      head: text.columns.areas,
      rows: areaRows(input),
      weights: [2.4, 1, 1, 1.2, 2],
    });
  }

  if (topics.includes("incidents")) {
    pdf.heading(text.sections.metrics);
    pdf.table({
      head: text.columns.metrics,
      rows: metricRows(input),
      weights: [2, 1, 1],
    });

    if (report.recent.length > 0) {
      pdf.heading(text.sections.incidents);
      pdf.table({
        head: text.columns.incidents,
        rows: incidentRows(input),
        weights: [1.8, 1.6, 2.6, 1.1, 1.2, 1.8],
      });
    }
  }

  if (topics.includes("scenarios")) {
    const rows = scenarioRows(input);

    if (rows.length > 0) {
      pdf.heading(text.sections.scenarios);
      pdf.table({
        head: text.columns.scenarios,
        rows,
        weights: [3, 1],
      });
    }
  }

  pdf.stampFooters(text.footer, text.page);

  return pdf;
}

export async function downloadGovReportPdf(
  input: GovReportPdfInput,
): Promise<void> {
  const pdf = await createGovReportPdf(input);

  pdf.save(fileSlug(input.report));
}
