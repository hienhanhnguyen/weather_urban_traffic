import { describe, expect, it } from "vitest";
import type { AlertSeverity } from "./api";
import type { AlertFrame } from "./socket";
import { byUrgency, urgencyFor } from "./toasts";

const alert = (severity: AlertSeverity, ruleId: number): AlertFrame => ({
  type: "alert",
  ruleId,
  locationId: 1,
  severity,
  metric: "rain",
  value: 12,
  unit: "mm",
  title: `rule ${ruleId}`,
  body: "body",
  issuedAt: "2026-08-12T02:00:00.000Z",
});

describe("urgencyFor", () => {
  it("interrupts only for critical", () => {
    expect(urgencyFor("critical")).toBe("assertive");
    expect(urgencyFor("warning")).toBe("polite");
    expect(urgencyFor("info")).toBe("polite");
  });
});

describe("byUrgency", () => {
  it("returns both groups for an empty list", () => {
    expect(byUrgency([])).toEqual({ assertive: [], polite: [] });
  });

  it("splits the alerts by how loudly they should be announced", () => {
    const groups = byUrgency([
      alert("info", 1),
      alert("critical", 2),
      alert("warning", 3),
    ]);

    expect(groups.assertive.map((entry) => entry.ruleId)).toEqual([2]);
    expect(groups.polite.map((entry) => entry.ruleId)).toEqual([1, 3]);
  });

  it("keeps arrival order inside a group", () => {
    const groups = byUrgency([
      alert("critical", 1),
      alert("info", 2),
      alert("critical", 3),
    ]);

    expect(groups.assertive.map((entry) => entry.ruleId)).toEqual([1, 3]);
  });
});
