import { describe, expect, it } from "vitest";
import type { ManagedArea } from "./api";
import {
  areaCollection,
  areaErrorCode,
  areaForm,
  areaPayload,
  checkArea,
  emptyAreaForm,
  isDrawn,
  polygonOf,
  ringAreaKm2,
  ringOf,
  type Ring,
} from "./geometry";

const BOX: Ring = [
  [105.8, 21.0],
  [105.9, 21.0],
  [105.9, 21.1],
  [105.8, 21.1],
  [105.8, 21.0],
];

const area: ManagedArea = {
  id: 3,
  name: "Hoàn Kiếm",
  areaType: "district",
  address: "Hà Nội",
  boundary: polygonOf(BOX),
  center: { latitude: 21.05, longitude: 105.85 },
  areaKm2: 115.5,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

describe("ringAreaKm2", () => {
  it("measures a tenth-degree box near Hanoi at about 115 km2", () => {
    expect(ringAreaKm2(BOX)).toBeGreaterThan(110);
    expect(ringAreaKm2(BOX)).toBeLessThan(120);
  });

  it("does not care which way the ring was drawn", () => {
    expect(ringAreaKm2([...BOX].reverse())).toBeCloseTo(ringAreaKm2(BOX), 9);
  });

  it("is zero while the ring is still being started", () => {
    expect(ringAreaKm2(BOX.slice(0, 2))).toBe(0);
  });
});

describe("isDrawn", () => {
  it("accepts a closed ring with three corners", () => {
    expect(isDrawn(BOX)).toBe(true);
  });

  it("rejects nothing drawn yet, an open ring and a two-point ring", () => {
    expect(isDrawn(null)).toBe(false);
    expect(isDrawn(BOX.slice(0, -1))).toBe(false);
    expect(isDrawn([BOX[0], BOX[1], BOX[0]])).toBe(false);
  });
});

describe("polygonOf / ringOf", () => {
  it("round-trips a ring through the GeoJSON the API stores", () => {
    expect(ringOf(polygonOf(BOX))).toEqual(BOX);
  });
});

describe("checkArea", () => {
  it("asks for a name first", () => {
    expect(checkArea({ ...emptyAreaForm, name: "   " }, BOX)).toBe(
      "nameRequired",
    );
  });

  it("asks for a boundary once the name is there", () => {
    expect(checkArea({ ...emptyAreaForm, name: "Ba Đình" }, null)).toBe(
      "boundaryRequired",
    );
  });

  it("is happy with a named, drawn area", () => {
    expect(checkArea({ ...emptyAreaForm, name: "Ba Đình" }, BOX)).toBeNull();
  });
});

describe("areaPayload", () => {
  it("trims the text and wraps the ring as GeoJSON", () => {
    expect(
      areaPayload(
        { name: "  Ba Đình  ", areaType: "district", address: "  Hà Nội " },
        BOX,
      ),
    ).toEqual({
      name: "Ba Đình",
      area_type: "district",
      address: "Hà Nội",
      boundary: { type: "Polygon", coordinates: [BOX] },
    });
  });

  it("sends no address rather than an empty one", () => {
    expect(
      areaPayload({ ...emptyAreaForm, name: "Ward 1", address: "  " }, BOX)
        ?.address,
    ).toBeNull();
  });

  it("refuses to build a payload the server would reject", () => {
    expect(areaPayload(emptyAreaForm, BOX)).toBeNull();
    expect(areaPayload({ ...emptyAreaForm, name: "Ward 1" }, null)).toBeNull();
  });
});

describe("areaForm", () => {
  it("fills the form from an existing area", () => {
    expect(areaForm(area)).toEqual({
      name: "Hoàn Kiếm",
      areaType: "district",
      address: "Hà Nội",
    });
  });

  it("shows an empty box for an area with no address", () => {
    expect(areaForm({ ...area, address: null }).address).toBe("");
  });
});

describe("areaErrorCode", () => {
  it("recognises the codes the officer can act on", () => {
    expect(areaErrorCode("RING_SELF_INTERSECTS")).toBe("RING_SELF_INTERSECTS");
    expect(areaErrorCode("AREA_NAME_TAKEN")).toBe("AREA_NAME_TAKEN");
  });

  it("falls through for anything else", () => {
    expect(areaErrorCode("INTERNAL_ERROR")).toBeNull();
    expect(areaErrorCode(undefined)).toBeNull();
  });
});

describe("areaCollection", () => {
  it("turns saved areas into one drawable layer", () => {
    const collection = areaCollection([area]);

    expect(collection.features).toHaveLength(1);
    expect(collection.features[0].id).toBe(3);
    expect(collection.features[0].geometry).toEqual(area.boundary);
    expect(collection.features[0].properties.name).toBe("Hoàn Kiếm");
  });
});
