import type { Position } from "@/features/map/geometry";
import type { AreaInput, AreaPolygon, AreaType, ManagedArea } from "./api";

export type Ring = Position[];

const EARTH_RADIUS_M = 6_371_008.8;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function ringAreaKm2(ring: Ring): number {
  if (ring.length < 4) return 0;

  let total = 0;

  for (let index = 0; index < ring.length - 1; index += 1) {
    const [lngA, latA] = ring[index];
    const [lngB, latB] = ring[index + 1];

    total +=
      toRadians(lngB - lngA) *
      (2 + Math.sin(toRadians(latA)) + Math.sin(toRadians(latB)));
  }

  return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2) / 1e6;
}

export const isClosed = (ring: Ring) =>
  ring.length > 1 &&
  ring[0][0] === ring[ring.length - 1][0] &&
  ring[0][1] === ring[ring.length - 1][1];

export const isDrawn = (ring: Ring | null): ring is Ring =>
  ring !== null && ring.length >= 4 && isClosed(ring);

export const polygonOf = (ring: Ring): AreaPolygon => ({
  type: "Polygon",
  coordinates: [ring],
});

export const ringOf = (boundary: AreaPolygon): Ring => boundary.coordinates[0];

export const AREA_TYPES: readonly AreaType[] = ["district", "ward"];

export interface AreaFormState {
  name: string;
  areaType: AreaType;
  address: string;
}

export const emptyAreaForm: AreaFormState = {
  name: "",
  areaType: "ward",
  address: "",
};

export const areaForm = (area: ManagedArea): AreaFormState => ({
  name: area.name,
  areaType: area.areaType,
  address: area.address ?? "",
});

export type AreaProblem = "nameRequired" | "boundaryRequired";

export function checkArea(
  form: AreaFormState,
  ring: Ring | null,
): AreaProblem | null {
  if (form.name.trim().length === 0) return "nameRequired";
  if (!isDrawn(ring)) return "boundaryRequired";
  return null;
}

export function areaPayload(
  form: AreaFormState,
  ring: Ring | null,
): AreaInput | null {
  if (checkArea(form, ring) || !isDrawn(ring)) return null;

  return {
    name: form.name.trim(),
    area_type: form.areaType,
    address: form.address.trim() || null,
    boundary: polygonOf(ring),
  };
}

const BOUNDARY_CODES = [
  "RING_TOO_SHORT",
  "RING_TOO_LONG",
  "POSITION_OUT_OF_RANGE",
  "RING_NOT_CLOSED",
  "RING_SELF_INTERSECTS",
  "AREA_TOO_SMALL",
  "AREA_TOO_LARGE",
  "AREA_NAME_TAKEN",
  "AREA_LIMIT_REACHED",
] as const;

export type AreaErrorCode = (typeof BOUNDARY_CODES)[number];

export const areaErrorCode = (code: string | undefined): AreaErrorCode | null =>
  BOUNDARY_CODES.includes(code as AreaErrorCode)
    ? (code as AreaErrorCode)
    : null;

export function areaCollection(areas: ManagedArea[]) {
  return {
    type: "FeatureCollection" as const,
    features: areas.map((area) => ({
      type: "Feature" as const,
      id: area.id,
      geometry: area.boundary,
      properties: { name: area.name },
    })),
  };
}
