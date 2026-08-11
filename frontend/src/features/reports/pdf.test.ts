import { describe, expect, it } from "vitest";
import type { BusinessReport } from "./api";
import {
  chartInput,
  conditionTableRows,
  fileSlug,
  kpiRows,
  pointRows,
  summaryRows,
  timelineRows,
  type ReportPdfFormat,
  type ReportPdfInput,
  type ReportPdfText,
} from "./pdf";

const report: BusinessReport = {
  route: {
    id: 4,
    name: "Hà Nội → Hải Phòng",
    start: { latitude: 21.0278, longitude: 105.8342, address: "Hoàn Kiếm" },
    end: { latitude: 20.8449, longitude: 106.6881, address: null },
    profile: "driving",
    distanceM: 120000,
    durationS: 7200,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
  range: "24h",
  generatedAt: "2026-08-11T09:30:00.000Z",
  timezone: "Asia/Ho_Chi_Minh",
  units: { temp: "°C", precip: "mm", wind: "km/h" },
  points: [
    {
      role: "start",
      latitude: 21.0278,
      longitude: 105.8342,
      address: "Hoàn Kiếm",
    },
    { role: "end", latitude: 20.8449, longitude: 106.6881, address: null },
  ],
  kpis: {
    hours: 24,
    avgTemp: 30,
    minTemp: 26,
    maxTemp: 34,
    totalPrecip: 5,
    maxPrecipProb: 80,
    avgHumidity: 78,
    avgWind: 12,
    maxWind: 25,
    wetHours: 6,
    disruptiveHours: 2,
  },
  series: [
    {
      at: "2026-08-11T00:00:00.000Z",
      temp: 27,
      tempMin: 26,
      tempMax: 28,
      precip: 0,
      precipProb: 10,
      humidity: 80,
      wind: 8,
    },
    {
      at: "2026-08-11T01:00:00.000Z",
      temp: null,
      tempMin: null,
      tempMax: null,
      precip: null,
      precipProb: null,
      humidity: null,
      wind: null,
    },
  ],
  frequency: [
    { group: "clear", hours: 0 },
    { group: "rain", hours: 6 },
    { group: "cloudy", hours: 18 },
  ],
};

const text: ReportPdfText = {
  title: "Route report",
  fields: {
    route: "Route",
    period: "Period",
    generatedAt: "Generated",
    timezone: "Time zone",
  },
  sections: {
    points: "Points",
    kpis: "Summary",
    conditions: "Conditions",
    trend: "Trend",
    timeline: "Timeline",
  },
  columns: {
    points: ["Role", "Address", "Coordinates"],
    kpis: ["Metric", "Value", "Detail"],
    conditions: ["Condition", "Hours", "Share"],
    timeline: ["Time", "Temp", "Precip", "Humidity", "Wind"],
  },
  range: (range) => `range:${range}`,
  role: (role) => `role:${role}`,
  kpi: (key) => `kpi:${key}`,
  kpiDetail: (key, value) => `${key}=${value}`,
  condition: (group) => `condition:${group}`,
  metric: (metric) => `metric:${metric}`,
  footer: "SWTIS",
  page: (page, total) => `${page}/${total}`,
};

const format: ReportPdfFormat = {
  timestamp: (iso) => `ts:${iso}`,
  point: (at) => `pt:${at}`,
  share: (share) => `${Math.round(share * 100)}%`,
};

const input: ReportPdfInput = { report, text, format };

const weekly = (): ReportPdfInput => ({
  ...input,
  report: { ...report, range: "7d" },
});

describe("summaryRows", () => {
  it("pairs each label with the value it describes", () => {
    expect(summaryRows(input)).toEqual([
      ["Route", "Hà Nội → Hải Phòng"],
      ["Period", "range:24h"],
      ["Generated", "ts:2026-08-11T09:30:00.000Z"],
      ["Time zone", "Asia/Ho_Chi_Minh"],
    ]);
  });
});

describe("pointRows", () => {
  it("renders each endpoint with fixed-precision coordinates", () => {
    expect(pointRows(input)[0]).toEqual([
      "role:start",
      "Hoàn Kiếm",
      "21.02780, 105.83420",
    ]);
  });

  it("marks a missing address rather than leaving a blank cell", () => {
    expect(pointRows(input)[1][1]).toBe("—");
  });
});

describe("kpiRows", () => {
  it("carries the value and its detail into three columns", () => {
    expect(kpiRows(input)[0]).toEqual(["kpi:avgTemp", "30°C", "range=26°C – 34°C"]);
  });

  it("leaves the detail cell empty when a metric has none", () => {
    const row = kpiRows(input).find(([label]) => label === "kpi:avgHumidity");

    expect(row).toEqual(["kpi:avgHumidity", "78%", ""]);
  });
});

describe("conditionTableRows", () => {
  it("drops empty groups and orders by hours", () => {
    expect(conditionTableRows(input)).toEqual([
      ["condition:cloudy", "18", "75%"],
      ["condition:rain", "6", "25%"],
    ]);
  });

  it("returns nothing when the report saw no weather at all", () => {
    const empty = { ...input, report: { ...report, frequency: [] } };

    expect(conditionTableRows(empty)).toEqual([]);
  });
});

describe("timelineRows", () => {
  it("appends the unit to every reading", () => {
    expect(timelineRows(input)[0]).toEqual([
      "pt:2026-08-11T00:00:00.000Z",
      "27°C",
      "0mm",
      "80%",
      "8km/h",
    ]);
  });

  it("writes a dash for a bucket with no readings", () => {
    expect(timelineRows(input)[1].slice(1)).toEqual(["—", "—", "—", "—"]);
  });

  it("shows the daily spread instead of a single temperature", () => {
    expect(timelineRows(weekly())[0][1]).toBe("26°C – 28°C");
  });
});

describe("chartInput", () => {
  it("keeps gaps as null so the line breaks instead of dropping to zero", () => {
    expect(chartInput(input, "temp")).toEqual({
      values: [27, null],
      labels: ["pt:2026-08-11T00:00:00.000Z", "pt:2026-08-11T01:00:00.000Z"],
      unit: "°C",
      color: "#f97316",
      kind: "line",
    });
  });

  it("draws precipitation as columns", () => {
    expect(chartInput(input, "precip").kind).toBe("bar");
  });
});

describe("fileSlug", () => {
  it("folds a Vietnamese route name into an ASCII filename", () => {
    expect(fileSlug(report)).toBe("report-ha-noi-hai-phong-24h-2026-08-11.pdf");
  });

  it("keeps đ readable rather than dropping it", () => {
    const named = { ...report, route: { ...report.route, name: "Đường 5" } };

    expect(fileSlug(named)).toBe("report-duong-5-24h-2026-08-11.pdf");
  });

  it("still names the file when the route name has no ASCII left", () => {
    const named = { ...report, route: { ...report.route, name: "—" } };

    expect(fileSlug(named)).toBe("report-route-24h-2026-08-11.pdf");
  });
});
