import type { ChartInput } from "@/lib/pdf/chart";
import type {
  BusinessReport,
  ConditionGroup,
  ReportPoint,
  ReportRange,
  SeriesRow,
} from "./api";
import {
  CHART_METRICS,
  METRIC_COLORS,
  conditionRows,
  kpiItems,
  metricKind,
  metricUnit,
  metricValue,
  type ChartMetric,
  type KpiDetailKey,
  type KpiKey,
} from "./format";

const NO_VALUE = "—";

const show = (value: number | null, unit = "") =>
  value === null ? NO_VALUE : `${value}${unit}`;

export interface ReportPdfText {
  title: string;
  fields: {
    route: string;
    period: string;
    generatedAt: string;
    timezone: string;
  };
  sections: {
    points: string;
    kpis: string;
    conditions: string;
    trend: string;
    timeline: string;
  };
  columns: {
    points: string[];
    kpis: string[];
    conditions: string[];
    timeline: string[];
  };
  range: (range: ReportRange) => string;
  role: (role: ReportPoint["role"]) => string;
  kpi: (key: KpiKey) => string;
  kpiDetail: (key: KpiDetailKey, value: string) => string;
  condition: (group: ConditionGroup) => string;
  metric: (metric: ChartMetric) => string;
  footer: string;
  page: (page: number, total: number) => string;
}

export interface ReportPdfFormat {
  timestamp: (iso: string) => string;
  point: (at: string) => string;
  share: (share: number) => string;
}

export interface ReportPdfInput {
  report: BusinessReport;
  text: ReportPdfText;
  format: ReportPdfFormat;
}

export function summaryRows({
  report,
  text,
  format,
}: ReportPdfInput): [string, string][] {
  return [
    [text.fields.route, report.route.name],
    [text.fields.period, text.range(report.range)],
    [text.fields.generatedAt, format.timestamp(report.generatedAt)],
    [text.fields.timezone, report.timezone],
  ];
}

const coordinates = (point: ReportPoint) =>
  `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;

export function pointRows({ report, text }: ReportPdfInput): string[][] {
  return report.points.map((point) => [
    text.role(point.role),
    point.address ?? NO_VALUE,
    coordinates(point),
  ]);
}

export function kpiRows({ report, text }: ReportPdfInput): string[][] {
  return kpiItems(report.kpis, report.units).map((item) => [
    text.kpi(item.key),
    item.value,
    item.detail ? text.kpiDetail(item.detail.key, item.detail.value) : "",
  ]);
}

export function conditionTableRows({
  report,
  text,
  format,
}: ReportPdfInput): string[][] {
  return conditionRows(report.frequency).map((row) => [
    text.condition(row.group),
    String(row.hours),
    format.share(row.share),
  ]);
}

const temperatureCell = (row: SeriesRow, range: ReportRange, unit: string) => {
  if (range === "7d" && row.tempMin !== null && row.tempMax !== null) {
    return `${row.tempMin}${unit} – ${row.tempMax}${unit}`;
  }

  return show(row.temp, unit);
};

export function timelineRows({
  report,
  format,
}: ReportPdfInput): string[][] {
  const { units } = report;

  return report.series.map((row) => [
    format.point(row.at),
    temperatureCell(row, report.range, units.temp),
    show(row.precip, units.precip),
    show(row.humidity, "%"),
    show(row.wind, units.wind),
  ]);
}

export function chartInput(
  { report, format }: ReportPdfInput,
  metric: ChartMetric,
): ChartInput {
  return {
    values: report.series.map((row) => metricValue(row, metric)),
    labels: report.series.map((row) => format.point(row.at)),
    unit: metricUnit(metric, report.units),
    color: METRIC_COLORS[metric],
    kind: metricKind(metric),
  };
}

export function fileSlug(report: BusinessReport): string {
  const name = report.route.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const day = report.generatedAt.slice(0, 10);

  return `report-${name || "route"}-${report.range}-${day}.pdf`;
}

const CHART_HEIGHT = 42;

export async function createReportPdf(input: ReportPdfInput) {
  const { PdfDocument } = await import("@/lib/pdf/document");
  const { drawChart } = await import("@/lib/pdf/chart");

  const { text } = input;

  const pdf = await PdfDocument.create({
    title: `${text.title} — ${input.report.route.name}`,
  });

  pdf.title(text.title);
  pdf.keyValues(summaryRows(input));

  pdf.heading(text.sections.points);
  pdf.table({
    head: text.columns.points,
    rows: pointRows(input),
    weights: [1, 3, 2],
  });

  pdf.heading(text.sections.kpis);
  pdf.table({
    head: text.columns.kpis,
    rows: kpiRows(input),
    weights: [2, 1, 2],
  });

  pdf.heading(text.sections.trend);
  for (const metric of CHART_METRICS) {
    pdf.heading(text.metric(metric));
    drawChart(pdf.doc, pdf.reserve(CHART_HEIGHT), chartInput(input, metric));
  }

  const conditions = conditionTableRows(input);
  if (conditions.length > 0) {
    pdf.heading(text.sections.conditions);
    pdf.table({
      head: text.columns.conditions,
      rows: conditions,
      weights: [2, 1, 1],
    });
  }

  pdf.heading(text.sections.timeline);
  pdf.table({
    head: text.columns.timeline,
    rows: timelineRows(input),
    weights: [2, 2, 1.4, 1.2, 1.4],
  });

  pdf.stampFooters(text.footer, text.page);

  return pdf;
}

export async function downloadReportPdf(input: ReportPdfInput): Promise<void> {
  const pdf = await createReportPdf(input);

  pdf.save(fileSlug(input.report));
}
