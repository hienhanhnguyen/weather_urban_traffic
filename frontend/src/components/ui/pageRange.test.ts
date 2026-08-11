import { describe, expect, it } from "vitest";
import { GAP, pageCount, pageRange } from "./pageRange";

describe("pageCount", () => {
  it("rounds a partial page up", () => {
    expect(pageCount(0, 20)).toBe(0);
    expect(pageCount(1, 20)).toBe(1);
    expect(pageCount(40, 20)).toBe(2);
    expect(pageCount(41, 20)).toBe(3);
  });

  it("refuses to divide by a page size of zero", () => {
    expect(pageCount(40, 0)).toBe(0);
  });
});

describe("pageRange", () => {
  it("lists every page while they still fit", () => {
    expect(pageRange(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageRange(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("keeps the first and last page reachable", () => {
    for (const current of [1, 7, 13, 20]) {
      const slots = pageRange(current, 20);
      expect(slots[0]).toBe(1);
      expect(slots.at(-1)).toBe(20);
    }
  });

  it("elides only the side that is actually far away", () => {
    expect(pageRange(1, 20)).toEqual([1, 2, 3, 4, GAP, 20]);
    expect(pageRange(20, 20)).toEqual([1, GAP, 17, 18, 19, 20]);
    expect(pageRange(10, 20)).toEqual([1, GAP, 9, 10, 11, GAP, 20]);
  });

  it("always includes the current page", () => {
    for (let current = 1; current <= 20; current += 1) {
      expect(pageRange(current, 20)).toContain(current);
    }
  });

  it("never exceeds the window", () => {
    for (let current = 1; current <= 40; current += 1) {
      expect(pageRange(current, 40).length).toBeLessThanOrEqual(7);
    }
  });

  it("stays sorted with no repeats", () => {
    const numbers = pageRange(10, 20).filter(
      (slot): slot is number => slot !== GAP,
    );

    expect(numbers).toEqual([...new Set(numbers)].sort((a, b) => a - b));
  });
});
