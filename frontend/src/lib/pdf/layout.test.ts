import { describe, expect, it } from "vitest";
import {
  bandCenters,
  columnWidths,
  domainOf,
  labelStride,
  niceTicks,
  scaleValue,
  type Frame,
} from "./layout";

const frame: Frame = { x: 10, y: 20, width: 100, height: 50 };

describe("niceTicks", () => {
  it("rounds the axis outwards to readable numbers", () => {
    expect(niceTicks(3.2, 27.8, 4)).toEqual([0, 10, 20, 30]);
  });

  it("gives a flat series height instead of a zero-tall axis", () => {
    expect(niceTicks(5, 5, 4)).toEqual([4, 5, 6]);
  });

  it("covers both ends of a negative range", () => {
    const ticks = niceTicks(-3, 12, 4);

    expect(ticks[0]).toBeLessThanOrEqual(-3);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(12);
  });

  it("returns nothing for a domain that is not finite", () => {
    expect(niceTicks(Number.NaN, 10)).toEqual([]);
    expect(niceTicks(0, Number.POSITIVE_INFINITY)).toEqual([]);
  });
});

describe("domainOf", () => {
  it("ignores gaps in the readings", () => {
    expect(domainOf([3, null, 9, null, 5])).toEqual([3, 9]);
  });

  it("pulls the floor down to zero when asked", () => {
    expect(domainOf([3, 9], true)).toEqual([0, 9]);
  });

  it("falls back to a unit domain when every reading is missing", () => {
    expect(domainOf([null, null])).toEqual([0, 1]);
  });
});

describe("scaleValue", () => {
  it("puts the low end at the bottom of the frame", () => {
    expect(scaleValue(0, [0, 10], frame)).toBe(70);
  });

  it("puts the high end at the top of the frame", () => {
    expect(scaleValue(10, [0, 10], frame)).toBe(20);
  });

  it("places the middle halfway up", () => {
    expect(scaleValue(5, [0, 10], frame)).toBe(45);
  });

  it("does not divide by zero on a collapsed domain", () => {
    expect(scaleValue(5, [5, 5], frame)).toBe(70);
  });
});

describe("bandCenters", () => {
  it("centres each value inside its own slice of the frame", () => {
    expect(bandCenters(4, frame)).toEqual([22.5, 47.5, 72.5, 97.5]);
  });

  it("returns nothing for an empty series", () => {
    expect(bandCenters(0, frame)).toEqual([]);
  });
});

describe("labelStride", () => {
  it("labels everything when everything fits", () => {
    expect(labelStride(7, 12)).toBe(1);
  });

  it("thins the labels down to what fits", () => {
    expect(labelStride(24, 8)).toBe(3);
  });

  it("never returns zero", () => {
    expect(labelStride(24, 0)).toBe(1);
  });
});

describe("columnWidths", () => {
  it("splits the width by weight", () => {
    expect(columnWidths([1, 1, 2], 100)).toEqual([25, 25, 50]);
  });

  it("ends flush with the text block despite rounding", () => {
    const widths = columnWidths([1, 1, 1], 100);

    expect(widths.reduce((sum, width) => sum + width, 0)).toBe(100);
  });

  it("returns zeroes rather than NaN when the weights are empty", () => {
    expect(columnWidths([0, 0], 100)).toEqual([0, 0]);
  });
});
