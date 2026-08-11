import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  endOfDay,
  isFiltered,
  isRangeBackwards,
  startOfDay,
  toEventQuery,
  type HistoryFilters,
} from "./filters";

const withFilters = (patch: Partial<HistoryFilters>): HistoryFilters => ({
  ...EMPTY_FILTERS,
  ...patch,
});

describe("day boundaries", () => {
  it("spans the whole local day", () => {
    const from = startOfDay("2026-03-05");
    const to = endOfDay("2026-03-05");

    expect(from).toBeDefined();
    expect(to).toBeDefined();
    expect(Date.parse(to!) - Date.parse(from!)).toBe(86_400_000 - 1);
  });

  it("starts at local midnight rather than UTC midnight", () => {
    const start = new Date(startOfDay("2026-03-05")!);

    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getDate()).toBe(5);
  });

  it("ignores a value the date input never produces", () => {
    expect(startOfDay("")).toBeUndefined();
    expect(startOfDay("not-a-date")).toBeUndefined();
  });
});

describe("toEventQuery", () => {
  it("sends only the page when nothing is filtered", () => {
    expect(toEventQuery(EMPTY_FILTERS, 3)).toEqual({ page: 3 });
  });

  it("maps the status filter onto the is_read flag", () => {
    expect(toEventQuery(withFilters({ read: "unread" }), 1).isRead).toBe(false);
    expect(toEventQuery(withFilters({ read: "read" }), 1).isRead).toBe(true);
  });

  it("passes the severity straight through", () => {
    expect(toEventQuery(withFilters({ severity: "critical" }), 1)).toMatchObject(
      { severity: "critical" },
    );
  });

  it("widens a single day into an inclusive range", () => {
    const query = toEventQuery(
      withFilters({ from: "2026-03-05", to: "2026-03-05" }),
      1,
    );

    expect(Date.parse(query.to!)).toBeGreaterThan(Date.parse(query.from!));
  });
});

describe("isRangeBackwards", () => {
  it("only complains once both ends are set", () => {
    expect(isRangeBackwards(withFilters({ from: "2026-03-09" }))).toBe(false);
    expect(isRangeBackwards(withFilters({ to: "2026-03-01" }))).toBe(false);
    expect(
      isRangeBackwards(withFilters({ from: "2026-03-09", to: "2026-03-01" })),
    ).toBe(true);
    expect(
      isRangeBackwards(withFilters({ from: "2026-03-01", to: "2026-03-09" })),
    ).toBe(false);
  });
});

describe("isFiltered", () => {
  it("notices any one filter", () => {
    expect(isFiltered(EMPTY_FILTERS)).toBe(false);
    expect(isFiltered(withFilters({ read: "unread" }))).toBe(true);
    expect(isFiltered(withFilters({ severity: "info" }))).toBe(true);
    expect(isFiltered(withFilters({ from: "2026-03-01" }))).toBe(true);
  });
});
