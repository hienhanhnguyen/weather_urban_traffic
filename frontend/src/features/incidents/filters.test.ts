import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  areaSelectValue,
  isFiltered,
  nextStatuses,
  parseAreaId,
  pendingShare,
  toIncidentQuery,
  toSummaryQuery,
  type IncidentFilters,
} from "./filters";

const filters = (overrides: Partial<IncidentFilters> = {}): IncidentFilters => ({
  ...DEFAULT_FILTERS,
  ...overrides,
});

describe("parseAreaId", () => {
  it("reads the all option and a real id", () => {
    expect(parseAreaId("all")).toBeNull();
    expect(parseAreaId("12")).toBe(12);
  });

  it("treats anything that is not an id as no filter", () => {
    expect(parseAreaId("")).toBeNull();
    expect(parseAreaId("0")).toBeNull();
    expect(parseAreaId("-3")).toBeNull();
    expect(parseAreaId("1.5")).toBeNull();
    expect(parseAreaId("nope")).toBeNull();
  });

  it("round-trips through the select value", () => {
    expect(parseAreaId(areaSelectValue(7))).toBe(7);
    expect(parseAreaId(areaSelectValue(null))).toBeNull();
  });
});

describe("toSummaryQuery", () => {
  it("sends nothing for the defaults except the timeframe", () => {
    expect(toSummaryQuery(DEFAULT_FILTERS)).toEqual({ timeframe: "7d" });
  });

  it("leaves the timeframe out when the officer asks for everything", () => {
    expect(toSummaryQuery(filters({ timeframe: "all" }))).toEqual({});
  });

  it("carries every filter that is actually set", () => {
    expect(
      toSummaryQuery(
        filters({
          timeframe: "24h",
          areaId: 4,
          severity: "critical",
          status: "pending",
        }),
      ),
    ).toEqual({
      timeframe: "24h",
      area_id: 4,
      severity: "critical",
      status: "pending",
    });
  });
});

describe("toIncidentQuery", () => {
  it("adds the page to the summary filters", () => {
    expect(toIncidentQuery(filters({ severity: "info" }), 3)).toEqual({
      timeframe: "7d",
      severity: "info",
      page: 3,
    });
  });
});

describe("isFiltered", () => {
  it("is false only for the starting view", () => {
    expect(isFiltered(DEFAULT_FILTERS)).toBe(false);
    expect(isFiltered(filters({ timeframe: "24h" }))).toBe(true);
    expect(isFiltered(filters({ areaId: 1 }))).toBe(true);
    expect(isFiltered(filters({ status: "resolved" }))).toBe(true);
  });
});

describe("nextStatuses", () => {
  it("never offers the status the incident already has", () => {
    expect(nextStatuses("pending")).toEqual(["acknowledged", "resolved"]);
    expect(nextStatuses("acknowledged")).toEqual(["resolved", "pending"]);
    expect(nextStatuses("resolved")).toEqual(["pending"]);
  });
});

describe("pendingShare", () => {
  it("reports zero for an area with no incidents at all", () => {
    expect(pendingShare(0, 0)).toBe(0);
  });

  it("rounds to whole percent", () => {
    expect(pendingShare(3, 1)).toBe(33);
    expect(pendingShare(4, 4)).toBe(100);
  });
});
