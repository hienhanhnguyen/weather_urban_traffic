import { describe, expect, it } from "vitest";
import type { WeatherUnits } from "@/features/weather/api";
import type { ReportKpis, ReportSchedule, SeriesRow } from "./api";
import {
  checkSchedule,
  conditionRows,
  dayLabelDate,
  emptyScheduleForm,
  kpiItems,
  metricKind,
  metricUnit,
  metricValue,
  scheduleForm,
  schedulePayload,
  weekdayDate,
} from "./format";

const METRIC: WeatherUnits = { temp: "°C", wind: "km/h", precip: "mm" };

const kpis = (over: Partial<ReportKpis> = {}): ReportKpis => ({
  hours: 4,
  avgTemp: 30,
  minTemp: 15,
  maxTemp: 45,
  totalPrecip: 1.5,
  maxPrecipProb: 100,
  avgHumidity: 55,
  avgWind: 7.5,
  maxWind: 12,
  wetHours: 2,
  disruptiveHours: 2,
  ...over,
});

const schedule = (over: Partial<ReportSchedule> = {}): ReportSchedule => ({
  id: 1,
  routeId: 9,
  range: "7d",
  frequency: "weekly",
  weekday: 3,
  dayOfMonth: null,
  hour: 18,
  nextRunAt: "2026-08-12T11:00:00.000Z",
  lastSentAt: null,
  ...over,
});

const row = (over: Partial<SeriesRow> = {}): SeriesRow => ({
  at: "2026-08-11T09:00:00.000Z",
  temp: 30,
  tempMin: null,
  tempMax: null,
  precip: 1.5,
  precipProb: 80,
  humidity: 55,
  wind: 12,
  ...over,
});

describe("kpiItems", () => {
  it("puts a unit on every reading", () => {
    const items = kpiItems(kpis(), METRIC);
    const value = (key: string) =>
      items.find((item) => item.key === key)?.value;

    expect(value("avgTemp")).toBe("30°C");
    expect(value("totalPrecip")).toBe("1.5mm");
    expect(value("avgWind")).toBe("7.5km/h");
    expect(value("maxPrecipProb")).toBe("100%");
  });

  it("counts the hours that were disruptive against the whole window", () => {
    const items = kpiItems(kpis({ hours: 168, disruptiveHours: 9 }), METRIC);
    expect(items.find((item) => item.key === "disruptiveHours")?.value).toBe(
      "9/168",
    );
  });

  it("carries the spread and the gust as details", () => {
    const items = kpiItems(kpis(), METRIC);

    expect(items[0].detail).toEqual({ key: "range", value: "15°C – 45°C" });
    expect(items[1].detail).toEqual({ key: "wetHours", value: "2/4" });
    expect(items[4].detail).toEqual({ key: "peakWind", value: "12km/h" });
  });

  it("says nothing rather than NaN when the forecast had no numbers", () => {
    const items = kpiItems(
      kpis({ avgTemp: null, minTemp: null, maxTemp: null, avgWind: null, maxWind: null }),
      METRIC,
    );

    expect(items[0].value).toBe("—");
    expect(items[0].detail).toBeNull();
    expect(items[4].detail).toBeNull();
  });
});

describe("conditionRows", () => {
  it("drops what never happened and puts the commonest first", () => {
    const rows = conditionRows([
      { group: "clear", hours: 1 },
      { group: "cloudy", hours: 0 },
      { group: "fog", hours: 1 },
      { group: "drizzle", hours: 0 },
      { group: "rain", hours: 6 },
      { group: "snow", hours: 0 },
      { group: "thunder", hours: 2 },
    ]);

    expect(rows.map((entry) => entry.group)).toEqual([
      "rain",
      "thunder",
      "clear",
      "fog",
    ]);
    expect(rows[0].share).toBe(0.6);
  });

  it("returns nothing at all when no hour was classified", () => {
    expect(conditionRows([{ group: "clear", hours: 0 }])).toEqual([]);
  });
});

describe("metrics", () => {
  it("draws rainfall as columns and readings as lines", () => {
    expect(metricKind("precip")).toBe("bar");
    expect(metricKind("temp")).toBe("line");
    expect(metricKind("humidity")).toBe("line");
  });

  it("labels each metric with the unit the report came back in", () => {
    expect(metricUnit("temp", METRIC)).toBe("°C");
    expect(metricUnit("wind", METRIC)).toBe("km/h");
    expect(metricUnit("precip", METRIC)).toBe("mm");
    expect(metricUnit("humidity", METRIC)).toBe("%");
  });

  it("reads the chosen measure off a bucket", () => {
    expect(metricValue(row(), "wind")).toBe(12);
    expect(metricValue(row({ humidity: null }), "humidity")).toBeNull();
  });
});

describe("dayLabelDate", () => {
  it("keeps a daily bucket on its own calendar day", () => {
    const date = dayLabelDate("2026-08-11");
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(7);
    expect(date.getDate()).toBe(11);
  });
});

describe("weekdayDate", () => {
  it("lands on the weekday the API means", () => {
    expect(weekdayDate(0).getDay()).toBe(0);
    expect(weekdayDate(1).getDay()).toBe(1);
    expect(weekdayDate(6).getDay()).toBe(6);
  });
});

describe("scheduleForm", () => {
  it("offers the route already on screen when nothing is scheduled", () => {
    expect(scheduleForm(null, 4)).toEqual({ ...emptyScheduleForm, routeId: "4" });
    expect(scheduleForm(null).routeId).toBe("");
  });

  it("fills the fields the stored schedule does not use with defaults", () => {
    const form = scheduleForm(schedule());

    expect(form).toEqual({
      routeId: "9",
      range: "7d",
      frequency: "weekly",
      weekday: "3",
      dayOfMonth: emptyScheduleForm.dayOfMonth,
      hour: "18",
    });
  });
});

describe("schedulePayload", () => {
  it("sends the weekday and not the day of month for a weekly schedule", () => {
    expect(schedulePayload(scheduleForm(schedule()))).toEqual({
      route_id: 9,
      range: "7d",
      frequency: "weekly",
      weekday: 3,
      hour: 18,
    });
  });

  it("sends the day of month and not the weekday for a monthly one", () => {
    const monthly = scheduleForm(
      schedule({ frequency: "monthly", weekday: null, dayOfMonth: 28 }),
    );

    expect(schedulePayload(monthly)).toEqual({
      route_id: 9,
      range: "7d",
      frequency: "monthly",
      day_of_month: 28,
      hour: 18,
    });
  });

  it("refuses to build a body without a route", () => {
    expect(checkSchedule(emptyScheduleForm)).toBe("routeRequired");
    expect(schedulePayload(emptyScheduleForm)).toBeNull();
  });
});
