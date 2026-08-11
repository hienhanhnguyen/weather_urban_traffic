import { describe, expect, it } from "vitest";
import { distanceParts, durationParts } from "./format";

describe("distanceParts", () => {
  it("keeps short distances in whole metres", () => {
    expect(distanceParts(240.6)).toEqual({
      value: 241,
      unit: "m",
      fractionDigits: 0,
    });
  });

  it("switches to kilometres at 1000 m", () => {
    expect(distanceParts(1000)).toEqual({
      value: 1,
      unit: "km",
      fractionDigits: 1,
    });
  });

  it("leaves the rounding of kilometres to the formatter", () => {
    expect(distanceParts(102_450).value).toBeCloseTo(102.45);
  });
});

describe("durationParts", () => {
  it("rounds to whole minutes", () => {
    expect(durationParts(95)).toEqual({ hours: 0, minutes: 2 });
  });

  it("splits hours out once there is an hour to split", () => {
    expect(durationParts(3661)).toEqual({ hours: 1, minutes: 1 });
  });

  it("reports a whole hour as no leftover minutes", () => {
    expect(durationParts(7200)).toEqual({ hours: 2, minutes: 0 });
  });
});
