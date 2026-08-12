import { describe, expect, it } from "vitest";
import type { Incident } from "@/features/incidents/api";
import type { GovReport } from "./api";
import {
  areaRows,
  chartInput,
  fileSlug,
  incidentRows,
  metricRows,
  overviewRows,
  scenarioRows,
  summaryRows,
  type GovReportPdfInput,
} from "./pdf";

const incident = (overrides: Partial<Incident> = {}): Incident => ({
  id: 1,
  areaId: 7,
  areaName: "North ward",
  title: "Rainfall alert",
  body: null,
  severity: "critical",
  metric: "precip",
  value: 41,
  status: "pending",
  scenarioId: null,
  scenarioName: null,
  activatedAt: null,
  handledAt: null,
  handledNote: null,
  isRead: false,
  createdAt: "2026-03-10T08:00:00.000Z",
  ...overrides,
});

const report: GovReport = {
  range: {
    timeframe: "7d",
    from: "2026-03-05T00:00:00.000Z",
    to: null,
    areaId: null,
  },
  generatedAt: "2026-03-12T09:00:00.000Z",
  timezone: "Asia/Bangkok",
  truncated: false,
  summary: {
    total: 4,
    bySeverity: { info: 1, warning: 1, critical: 2 },
    byStatus: { pending: 2, acknowledged: 1, resolved: 1 },
    areasAffected: 2,
    areasManaged: 3,
  },
  areas: [
    {
      areaId: 7,
      name: "North ward",
      total: 3,
      pending: 2,
      worstSeverity: "critical",
      lastAt: "2026-03-10T08:00:00.000Z",
    },
    {
      areaId: 8,
      name: "Quiet ward",
      total: 0,
      pending: 0,
      worstSeverity: null,
      lastAt: null,
    },
  ],
  daily: [
    { day: "2026-03-10", total: 3, info: 1, warning: 0, critical: 2 },
    { day: "2026-03-11", total: 0, info: 0, warning: 0, critical: 0 },
    { day: "2026-03-12", total: 1, info: 0, warning: 1, critical: 0 },
  ],
  metrics: [
    { metric: "temp", count: 1 },
    { metric: "feelslike", count: 0 },
    { metric: "precip", count: 3 },
    { metric: "precipprob", count: 0 },
  ],
  response: {
    handled: 2,
    pending: 2,
    handledShare: 0.5,
    averageMinutes: 75,
    slowestMinutes: 120,
  },
  scenarios: {
    rows: [
      { scenarioId: 1, name: "Heavy rain plan", status: "active", activations: 2 },
      { scenarioId: 2, name: "Heat plan", status: "draft", activations: 0 },
    ],
    activated: 2,
    uncovered: 2,
  },
  recent: [
    incident(),
    incident({
      id: 2,
      areaName: null,
      status: "resolved",
      severity: "info",
      scenarioName: "Heavy rain plan",
    }),
  ],
};

const input: GovReportPdfInput = {
  report,
  topics: ["areas", "incidents", "scenarios"],
  areaName: null,
  text: {
    title: "Area report",
    fields: {
      period: "Period",
      area: "Area",
      generatedAt: "Generated",
      timezone: "Time zone",
    },
    sections: {
      overview: "Overview",
      trend: "Trend",
      areas: "Areas",
      metrics: "Measurements",
      incidents: "Incidents",
      scenarios: "Response plans",
    },
    columns: {
      overview: ["Figure", "Value"],
      areas: ["Area", "Total", "Pending", "Worst", "Last"],
      metrics: ["Measurement", "Incidents", "Share"],
      incidents: ["Time", "Area", "Title", "Severity", "Status", "Plan"],
      scenarios: ["Plan", "Activations"],
    },
    overview: (key) => `overview:${key}`,
    metric: (metric) => `metric:${metric}`,
    severity: (severity) => `severity:${severity}`,
    status: (status) => `status:${status}`,
    quiet: "Quiet",
    noPlan: "No plan",
    allAreas: "All areas",
    truncated: "Truncated",
    footer: "Weather service",
    page: (page, total) => `${page}/${total}`,
  },
  format: {
    timestamp: (iso) => iso.slice(0, 16),
    day: (day) => day.slice(5),
    share: (share) => `${Math.round(share * 100)}%`,
    duration: (minutes) => (minutes === null ? "—" : `${minutes}m`),
    number: (value) => String(value),
  },
};

describe("summaryRows", () => {
  it("closes an open period at the moment the report was built", () => {
    expect(summaryRows(input)).toEqual([
      ["Period", "2026-03-05T00:00 – 2026-03-12T09:00"],
      ["Area", "All areas"],
      ["Generated", "2026-03-12T09:00"],
      ["Time zone", "Asia/Bangkok"],
    ]);
  });

  it("names the area when the report is narrowed to one", () => {
    const rows = summaryRows({ ...input, areaName: "North ward" });

    expect(rows[1]).toEqual(["Area", "North ward"]);
  });

  it("shows no period at all when the report covers everything", () => {
    const everything = {
      ...input,
      report: { ...report, range: { ...report.range, from: null } },
    };

    expect(summaryRows(everything)[0]).toEqual(["Period", "—"]);
  });
});

describe("overviewRows", () => {
  it("pairs the handled count with its share and the response times", () => {
    const rows = overviewRows(input);

    expect(rows).toContainEqual(["overview:handled", "2 (50%)"]);
    expect(rows).toContainEqual(["overview:averageResponse", "75m"]);
    expect(rows).toContainEqual(["overview:areasAffected", "2 / 3"]);
  });

  it("leaves the response times blank when nothing was handled", () => {
    const quiet = {
      ...input,
      report: {
        ...report,
        response: {
          handled: 0,
          pending: 0,
          handledShare: 0,
          averageMinutes: null,
          slowestMinutes: null,
        },
      },
    };

    expect(overviewRows(quiet)).toContainEqual(["overview:averageResponse", "—"]);
  });
});

describe("areaRows", () => {
  it("marks an area that saw nothing as quiet", () => {
    expect(areaRows(input)).toEqual([
      ["North ward", "3", "2", "severity:critical", "2026-03-10T08:00"],
      ["Quiet ward", "0", "0", "Quiet", "—"],
    ]);
  });
});

describe("metricRows", () => {
  it("shares are taken against the whole period", () => {
    expect(metricRows(input)).toEqual([
      ["metric:temp", "1", "25%"],
      ["metric:feelslike", "0", "0%"],
      ["metric:precip", "3", "75%"],
      ["metric:precipprob", "0", "0%"],
    ]);
  });

  it("does not divide by zero over an empty period", () => {
    const empty = {
      ...input,
      report: { ...report, summary: { ...report.summary, total: 0 } },
    };

    expect(metricRows(empty)[0]).toEqual(["metric:temp", "1", "—"]);
  });
});

describe("scenarioRows", () => {
  it("lists only the plans that were actually used", () => {
    expect(scenarioRows(input)).toEqual([["Heavy rain plan", "2"]]);
  });
});

describe("incidentRows", () => {
  it("fills in the gaps an incident is allowed to have", () => {
    expect(incidentRows(input)[1]).toEqual([
      "2026-03-10T08:00",
      "—",
      "Rainfall alert",
      "severity:info",
      "status:resolved",
      "Heavy rain plan",
    ]);
  });
});

describe("chartInput", () => {
  it("plots every day, including the quiet ones", () => {
    expect(chartInput(input)).toMatchObject({
      values: [3, 0, 1],
      labels: ["03-10", "03-11", "03-12"],
      kind: "bar",
    });
  });
});

describe("fileSlug", () => {
  it("names the file after the window and the day", () => {
    expect(fileSlug(report)).toBe("area-report-7d-2026-03-12.pdf");
  });

  it("falls back when the window was a custom range", () => {
    expect(
      fileSlug({ ...report, range: { ...report.range, timeframe: null } }),
    ).toBe("area-report-custom-2026-03-12.pdf");
  });
});
