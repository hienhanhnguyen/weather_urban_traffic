import { describe, expect, it } from "vitest";
import type { WeatherUnits } from "@/features/weather/api";
import type { FiredRule } from "./api";
import {
  barHeight,
  checkDeparture,
  fromLocalInput,
  nextHour,
  ruleReading,
  ruleThreshold,
  toLocalInput,
} from "./format";

const METRIC: WeatherUnits = { temp: "°C", wind: "km/h", precip: "mm" };

const rule = (over: Partial<FiredRule> = {}): FiredRule => ({
  key: "rain",
  metric: "precip",
  value: 8,
  threshold: 7.6,
  points: 35,
  ...over,
});

describe("toLocalInput", () => {
  it("pads every part to what the input expects", () => {
    expect(toLocalInput(new Date(2026, 0, 5, 7, 3))).toBe("2026-01-05T07:03");
  });

  it("survives a round trip through the input", () => {
    const date = new Date(2026, 7, 11, 16, 45);
    expect(fromLocalInput(toLocalInput(date))?.getTime()).toBe(date.getTime());
  });
});

describe("fromLocalInput", () => {
  it("rejects anything that is not the input's own format", () => {
    expect(fromLocalInput("")).toBeNull();
    expect(fromLocalInput("tomorrow")).toBeNull();
    expect(fromLocalInput("2026-08-11")).toBeNull();
    expect(fromLocalInput("2026-08-11T09:00:00Z")).toBeNull();
  });

  it("rejects a date that does not exist", () => {
    expect(fromLocalInput("2026-02-31T09:00")).toBeNull();
  });
});

describe("nextHour", () => {
  it("moves to the top of the following hour", () => {
    expect(toLocalInput(nextHour(new Date(2026, 7, 11, 16, 45)))).toBe(
      "2026-08-11T17:00",
    );
  });

  it("rolls the day over at midnight", () => {
    expect(toLocalInput(nextHour(new Date(2026, 7, 11, 23, 10)))).toBe(
      "2026-08-12T00:00",
    );
  });
});

describe("checkDeparture", () => {
  const now = new Date(2026, 7, 11, 16, 45);

  it("wants a time at all", () => {
    expect(checkDeparture("", now)).toBe("required");
  });

  it("accepts the hour that is already running", () => {
    expect(checkDeparture("2026-08-11T16:00", now)).toBeNull();
  });

  it("refuses an hour that has finished", () => {
    expect(checkDeparture("2026-08-11T15:00", now)).toBe("past");
  });

  it("accepts a departure inside the forecast horizon", () => {
    expect(checkDeparture("2026-08-13T08:00", now)).toBeNull();
  });

  it("refuses a departure past the horizon", () => {
    expect(checkDeparture("2026-08-14T08:00", now)).toBe("tooFar");
  });
});

describe("ruleReading", () => {
  it("reads a measurement back with its unit", () => {
    expect(ruleReading(rule(), METRIC)).toBe("8mm");
    expect(ruleThreshold(rule(), METRIC)).toBe("7.6mm");
  });

  it("uses per-cent for a probability, not a weather unit", () => {
    const chance = rule({ key: "rainChance", metric: "precipProb", value: 90 });
    expect(ruleReading(chance, METRIC)).toBe("90%");
  });

  it("says nothing for a rule the weather code named outright", () => {
    const storm = rule({
      key: "thunderstorm",
      metric: "weatherCode",
      value: 95,
      threshold: null,
    });

    expect(ruleReading(storm, METRIC)).toBeNull();
    expect(ruleThreshold(storm, METRIC)).toBeNull();
  });

  it("says nothing when the measurement is missing", () => {
    expect(ruleReading(rule({ value: null }), METRIC)).toBeNull();
  });
});

describe("barHeight", () => {
  it("keeps a calm hour visible and a clipped one inside the box", () => {
    expect(barHeight(0)).toBe("6%");
    expect(barHeight(50)).toBe("50%");
    expect(barHeight(140)).toBe("100%");
  });
});
