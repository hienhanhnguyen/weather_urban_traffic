import { describe, expect, it } from "vitest";
import type { GovReportSchedule } from "./api";
import {
  DEFAULT_REPORT_FILTERS,
  busiestDay,
  checkSchedule,
  duration,
  emptyScheduleForm,
  isAreaMetric,
  scheduleForm,
  schedulePayload,
  toReportQuery,
  toggleTopic,
} from "./report";

describe("toggleTopic", () => {
  it("turns a topic off", () => {
    expect(toggleTopic(["areas", "incidents"], "areas")).toEqual(["incidents"]);
  });

  it("turns a topic back on in the canonical order", () => {
    expect(toggleTopic(["scenarios"], "areas")).toEqual(["areas", "scenarios"]);
  });

  it("refuses to leave the report with nothing in it", () => {
    expect(toggleTopic(["areas"], "areas")).toEqual(["areas"]);
  });
});

describe("toReportQuery", () => {
  it("drops the area when the whole territory is asked for", () => {
    expect(toReportQuery(DEFAULT_REPORT_FILTERS)).toEqual({ timeframe: "7d" });
  });

  it("keeps the area when one is chosen", () => {
    expect(toReportQuery({ timeframe: "30d", areaId: 4 })).toEqual({
      timeframe: "30d",
      area_id: 4,
    });
  });
});

describe("duration", () => {
  it("has nothing to show without a measurement", () => {
    expect(duration(null)).toEqual({ kind: "none" });
  });

  it("stays in minutes below the hour", () => {
    expect(duration(59)).toEqual({ kind: "minutes", minutes: 59 });
  });

  it("splits into hours and minutes above it", () => {
    expect(duration(135)).toEqual({ kind: "hours", hours: 2, minutes: 15 });
  });
});

describe("busiestDay", () => {
  const day = (label: string, total: number) => ({
    day: label,
    total,
    info: 0,
    warning: total,
    critical: 0,
  });

  it("finds the peak", () => {
    expect(
      busiestDay([day("2026-03-10", 2), day("2026-03-11", 5), day("2026-03-12", 1)]),
    ).toEqual(day("2026-03-11", 5));
  });

  it("is null over an empty period", () => {
    expect(busiestDay([])).toBeNull();
  });
});

describe("isAreaMetric", () => {
  it("accepts a measurement the rest of the app knows", () => {
    expect(isAreaMetric("precip")).toBe(true);
  });

  it("rejects the catch-all bucket", () => {
    expect(isAreaMetric("other")).toBe(false);
  });
});

describe("the schedule form", () => {
  const saved: GovReportSchedule = {
    id: 3,
    range: "30d",
    topics: ["areas", "scenarios"],
    frequency: "monthly",
    weekday: null,
    dayOfMonth: 12,
    hour: 6,
    nextRunAt: "2026-04-12T06:00:00.000Z",
    lastSentAt: null,
  };

  it("starts from the defaults when nothing is saved", () => {
    expect(scheduleForm(null)).toEqual(emptyScheduleForm);
  });

  it("fills the unused frequency field with a usable default", () => {
    const form = scheduleForm(saved);

    expect(form.dayOfMonth).toBe("12");
    expect(form.weekday).toBe(emptyScheduleForm.weekday);
    expect(form.topics).toEqual(["areas", "scenarios"]);
  });

  it("sends only the field the chosen frequency uses", () => {
    expect(schedulePayload({ ...emptyScheduleForm, frequency: "weekly" })).toEqual({
      range: "7d",
      topics: ["areas", "incidents", "scenarios"],
      frequency: "weekly",
      hour: 7,
      weekday: 1,
    });

    expect(schedulePayload(scheduleForm(saved))).toEqual({
      range: "30d",
      topics: ["areas", "scenarios"],
      frequency: "monthly",
      hour: 6,
      day_of_month: 12,
    });
  });

  it("will not save a schedule with no sections", () => {
    const empty = { ...emptyScheduleForm, topics: [] };

    expect(checkSchedule(empty)).toBe("topicsRequired");
    expect(schedulePayload(empty)).toBeNull();
  });
});
