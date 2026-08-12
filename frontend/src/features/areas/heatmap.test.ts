import { describe, expect, it } from "vitest";
import type { AreaTally } from "@/features/incidents/api";
import { polygonOf, type Ring } from "./geometry";
import type { AreaRisk, HeatmapArea } from "./heatmap-api";
import {
  RISK_COLOR,
  boundsOfAreas,
  digest,
  exceededMetrics,
  heatmapCollection,
  incidentPins,
  isAtRisk,
  riskRank,
  sortByRisk,
} from "./heatmap";

const ringAt = (lng: number, lat: number): Ring => [
  [lng, lat],
  [lng + 0.1, lat],
  [lng + 0.1, lat + 0.1],
  [lng, lat + 0.1],
  [lng, lat],
];

const area = (
  id: number,
  name: string,
  risk: AreaRisk,
  reading: Partial<NonNullable<HeatmapArea["reading"]>> | null = {},
  at: [number, number] = [105.8, 21.0],
): HeatmapArea => ({
  id,
  name,
  areaType: "ward",
  address: null,
  boundary: polygonOf(ringAt(at[0], at[1])),
  center: { latitude: at[1] + 0.05, longitude: at[0] + 0.05 },
  areaKm2: 100,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  risk,
  reading:
    reading === null
      ? null
      : {
          observedAt: "2026-01-01T00:00:00.000Z",
          isDay: true,
          weatherCode: 61,
          temp: 30,
          feelsLike: 32,
          humidity: 70,
          precip: 0,
          precipProb: 50,
          windSpeed: 10,
          ...reading,
        },
  metrics: [],
});

describe("riskRank", () => {
  it("orders the answers from nothing known to worst known", () => {
    expect(riskRank("critical")).toBeGreaterThan(riskRank("warning"));
    expect(riskRank("warning")).toBeGreaterThan(riskRank("info"));
    expect(riskRank("info")).toBeGreaterThan(riskRank("unknown"));
    expect(riskRank("unknown")).toBeGreaterThan(riskRank("clear"));
    expect(riskRank("clear")).toBeGreaterThan(riskRank("none"));
  });

  it("counts only the three severities as being at risk", () => {
    expect(isAtRisk("critical")).toBe(true);
    expect(isAtRisk("info")).toBe(true);
    expect(isAtRisk("unknown")).toBe(false);
    expect(isAtRisk("clear")).toBe(false);
  });
});

describe("sortByRisk", () => {
  it("puts the worst area first and breaks ties by name", () => {
    const sorted = sortByRisk([
      area(1, "Bravo", "clear"),
      area(2, "Alpha", "clear"),
      area(3, "Charlie", "warning"),
    ]);

    expect(sorted.map((row) => row.name)).toEqual(["Charlie", "Alpha", "Bravo"]);
  });

  it("leaves the input alone", () => {
    const areas = [area(1, "Bravo", "clear"), area(2, "Alpha", "critical")];
    sortByRisk(areas);

    expect(areas.map((row) => row.id)).toEqual([1, 2]);
  });
});

describe("digest", () => {
  it("has nothing to report for an officer with no areas", () => {
    const result = digest([]);

    expect(result.total).toBe(0);
    expect(result.worst).toBe("none");
    expect(result.avgPrecip).toBeNull();
    expect(result.maxWind).toBeNull();
    expect(result.windiest).toBeNull();
  });

  it("counts every risk and reports the worst one", () => {
    const result = digest([
      area(1, "A", "clear"),
      area(2, "B", "warning"),
      area(3, "C", "critical"),
      area(4, "D", "none"),
    ]);

    expect(result.counts.clear).toBe(1);
    expect(result.counts.critical).toBe(1);
    expect(result.atRisk).toBe(2);
    expect(result.unwatched).toBe(1);
    expect(result.worst).toBe("critical");
  });

  it("averages rainfall over the areas that reported, not over all of them", () => {
    const result = digest([
      area(1, "A", "clear", { precip: 4 }),
      area(2, "B", "clear", { precip: 6 }),
      area(3, "C", "unknown", null),
    ]);

    expect(result.avgPrecip).toBe(5);
  });

  it("names the windiest area alongside its reading", () => {
    const result = digest([
      area(1, "A", "clear", { windSpeed: 12 }),
      area(2, "B", "clear", { windSpeed: 31 }),
      area(3, "C", "unknown", null),
    ]);

    expect(result.maxWind).toBe(31);
    expect(result.windiest).toBe("B");
  });

  it("keeps a calm zero apart from a missing reading", () => {
    const result = digest([area(1, "A", "clear", { precip: 0, windSpeed: 0 })]);

    expect(result.avgPrecip).toBe(0);
    expect(result.maxWind).toBe(0);
  });
});

describe("heatmapCollection", () => {
  it("paints each polygon from the shared risk table and flags the selection", () => {
    const collection = heatmapCollection(
      [area(1, "A", "critical"), area(2, "B", "none")],
      2,
    );

    expect(collection.features).toHaveLength(2);
    expect(collection.features[0].properties.color).toBe(RISK_COLOR.critical);
    expect(collection.features[0].properties.selected).toBe(false);
    expect(collection.features[1].properties.selected).toBe(true);
    expect(collection.features[1].geometry.type).toBe("Polygon");
  });
});

describe("boundsOfAreas", () => {
  it("spans every boundary the officer manages", () => {
    const bounds = boundsOfAreas([
      area(1, "A", "clear", {}, [105.8, 21.0]),
      area(2, "B", "clear", {}, [106.6, 10.7]),
    ]);

    expect(bounds![0][0]).toBeCloseTo(105.8, 6);
    expect(bounds![0][1]).toBeCloseTo(10.7, 6);
    expect(bounds![1][0]).toBeCloseTo(106.7, 6);
    expect(bounds![1][1]).toBeCloseTo(21.1, 6);
  });

  it("has nothing to fit when there are no areas", () => {
    expect(boundsOfAreas([])).toBeNull();
  });
});

describe("exceededMetrics", () => {
  it("keeps only the enabled rules the reading is breaking", () => {
    const subject = area(1, "A", "warning");
    subject.metrics = [
      {
        metric: "temp",
        unit: "C",
        threshold: 35,
        severity: "warning",
        isEnabled: true,
        value: 38,
        exceeded: true,
      },
      {
        metric: "precip",
        unit: "mm",
        threshold: 10,
        severity: "critical",
        isEnabled: true,
        value: 2,
        exceeded: false,
      },
      {
        metric: "precipprob",
        unit: "%",
        threshold: 10,
        severity: "info",
        isEnabled: false,
        value: 90,
        exceeded: true,
      },
    ];

    expect(exceededMetrics(subject).map((metric) => metric.metric)).toEqual([
      "temp",
    ]);
  });
});

describe("incidentPins", () => {
  const tally = (overrides: Partial<AreaTally>): AreaTally => ({
    areaId: 1,
    name: "A",
    total: 3,
    pending: 2,
    worstSeverity: "warning",
    lastAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  });

  it("pins a count on the centre of each area that has incidents", () => {
    const pins = incidentPins(
      [area(1, "A", "warning", {}, [105.8, 21.0])],
      [tally({})],
    );

    expect(pins).toHaveLength(1);
    expect(pins[0].center).toEqual({ latitude: 21.05, longitude: 105.85 });
    expect(pins[0].pending).toBe(2);
  });

  it("drops a quiet area and one whose polygon is not on the map", () => {
    const pins = incidentPins(
      [area(1, "A", "clear")],
      [tally({}), tally({ areaId: 1, total: 0 }), tally({ areaId: 99 })],
    );

    expect(pins.map((pin) => pin.areaId)).toEqual([1]);
  });
});
