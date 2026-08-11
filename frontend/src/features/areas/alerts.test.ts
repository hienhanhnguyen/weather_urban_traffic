import { describe, expect, it } from "vitest";
import type { AreaAlertRule } from "./alerts-api";
import {
  alertForm,
  cooldownParts,
  alertRulesPayload,
  clampThreshold,
  emptyAlertForm,
  watchedCount,
} from "./alerts";

const rule = (overrides: Partial<AreaAlertRule> = {}): AreaAlertRule => ({
  id: 1,
  areaId: 3,
  metric: "temp",
  threshold: 36,
  unit: "C",
  severity: "warning",
  cooldownMinutes: 60,
  isEnabled: true,
  lastTriggeredAt: null,
  lastValue: null,
  ...overrides,
});

describe("emptyAlertForm", () => {
  it("starts with nothing watched and a fresh object each time", () => {
    const first = emptyAlertForm();
    first.metrics.temp.enabled = true;

    expect(watchedCount(emptyAlertForm())).toBe(0);
    expect(emptyAlertForm().metrics.temp.enabled).toBe(false);
  });

  it("seeds every metric with a usable starting threshold", () => {
    const form = emptyAlertForm();

    expect(form.metrics.precip.threshold).toBe(50);
    expect(form.metrics.precipprob.threshold).toBe(70);
    expect(form.cooldownMinutes).toBe(60);
  });
});

describe("alertForm", () => {
  it("switches on the metrics the area already watches", () => {
    const form = alertForm([
      rule({ metric: "temp", threshold: 34, cooldownMinutes: 180 }),
      rule({ id: 2, metric: "precip", threshold: 80, severity: "critical" }),
    ]);

    expect(form.cooldownMinutes).toBe(180);
    expect(form.metrics.temp).toEqual({
      enabled: true,
      threshold: 34,
      severity: "warning",
    });
    expect(form.metrics.precip.severity).toBe("critical");
    expect(form.metrics.feelslike.enabled).toBe(false);
  });

  it("keeps the default threshold for a metric that has no rule", () => {
    expect(alertForm([rule()]).metrics.precipprob.threshold).toBe(70);
  });

  it("carries a disabled rule through as an unchecked box", () => {
    const form = alertForm([rule({ isEnabled: false, threshold: 40 })]);

    expect(form.metrics.temp.enabled).toBe(false);
    expect(form.metrics.temp.threshold).toBe(40);
  });

  it("pulls a stored threshold back inside the range of its metric", () => {
    expect(alertForm([rule({ threshold: 900 })]).metrics.temp.threshold).toBe(
      60,
    );
  });
});

describe("clampThreshold", () => {
  it("holds each metric inside its own bounds", () => {
    expect(clampThreshold("precipprob", 180)).toBe(100);
    expect(clampThreshold("precip", -5)).toBe(0);
    expect(clampThreshold("temp", 21)).toBe(21);
  });

  it("falls back to the default when the box is empty", () => {
    expect(clampThreshold("temp", Number.NaN)).toBe(36);
  });
});

describe("alertRulesPayload", () => {
  it("sends only what is switched on, with the shared cooldown", () => {
    const form = emptyAlertForm();
    form.cooldownMinutes = 180;
    form.metrics.temp = { enabled: true, threshold: 37, severity: "critical" };
    form.metrics.precip.enabled = true;

    expect(alertRulesPayload(form)).toEqual([
      {
        metric: "temp",
        threshold: 37,
        severity: "critical",
        cooldown_minutes: 180,
        is_enabled: true,
      },
      {
        metric: "precip",
        threshold: 50,
        severity: "warning",
        cooldown_minutes: 180,
        is_enabled: true,
      },
    ]);
  });

  it("sends an empty list when every watch is off, which clears the area", () => {
    expect(alertRulesPayload(emptyAlertForm())).toEqual([]);
  });

  it("never sends a threshold the API would reject", () => {
    const form = emptyAlertForm();
    form.metrics.precipprob = {
      enabled: true,
      threshold: 250,
      severity: "info",
    };

    expect(alertRulesPayload(form)[0].threshold).toBe(100);
  });
});

describe("cooldownParts", () => {
  it("switches to hours once the gap is a whole number of them", () => {
    expect(cooldownParts(15)).toEqual({ unit: "minutes", value: 15 });
    expect(cooldownParts(60)).toEqual({ unit: "hours", value: 1 });
    expect(cooldownParts(1440)).toEqual({ unit: "hours", value: 24 });
    expect(cooldownParts(90)).toEqual({ unit: "minutes", value: 90 });
  });
});
