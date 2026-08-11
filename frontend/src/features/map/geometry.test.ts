import { describe, expect, it } from "vitest";
import { boundsOf, haversine, splitRoute, type Position } from "./geometry";

const equator = (degrees: number[]): Position[] =>
  degrees.map((lng) => [lng, 0]);

describe("haversine", () => {
  it("measures a degree at the equator", () => {
    expect(haversine([0, 0], [1, 0])).toBeCloseTo(111_195, 0);
  });

  it("is zero for a point against itself", () => {
    expect(haversine([106.63, 10.82], [106.63, 10.82])).toBe(0);
  });
});

describe("splitRoute", () => {
  it("cuts by length, not by vertex count", () => {
    const segments = splitRoute(equator([0, 0.1, 0.2, 4]), 2);

    expect(segments).toHaveLength(2);
    expect(segments[0].coordinates.at(-1)?.[0]).toBeCloseTo(2, 5);
    expect(segments[1].coordinates[0][0]).toBeCloseTo(2, 5);
  });

  it("puts each midpoint at the centre of its own segment", () => {
    const [first, second] = splitRoute(equator([0, 4]), 2);

    expect(first.midpoint[0]).toBeCloseTo(1, 5);
    expect(second.midpoint[0]).toBeCloseTo(3, 5);
  });

  it("keeps the original endpoints", () => {
    const segments = splitRoute(equator([0, 1, 2, 3]), 3);

    expect(segments[0].coordinates[0][0]).toBeCloseTo(0, 5);
    expect(segments.at(-1)?.coordinates.at(-1)?.[0]).toBeCloseTo(3, 5);
  });

  it("returns nothing for a route with no length", () => {
    expect(splitRoute(equator([1, 1, 1]), 4)).toEqual([]);
    expect(splitRoute([[1, 1]], 4)).toEqual([]);
    expect(splitRoute([], 4)).toEqual([]);
  });
});

describe("boundsOf", () => {
  it("returns south-west and north-east corners", () => {
    expect(
      boundsOf([
        [10, 5],
        [-3, 20],
        [4, -8],
      ]),
    ).toEqual([
      [-3, -8],
      [10, 20],
    ]);
  });

  it("returns null when there is nothing to bound", () => {
    expect(boundsOf([])).toBeNull();
  });
});
