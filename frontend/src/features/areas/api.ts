import { apiRequest } from "@/lib/api/client";
import type { Position } from "@/features/map/geometry";

export type AreaType = "district" | "ward";

export interface AreaPolygon {
  type: "Polygon";
  coordinates: Position[][];
}

export interface ManagedArea {
  id: number;
  name: string;
  areaType: AreaType;
  address: string | null;
  boundary: AreaPolygon;
  center: { latitude: number; longitude: number };
  areaKm2: number;
  createdAt: string;
  updatedAt: string;
}

export interface AreaInput {
  name: string;
  area_type: AreaType;
  address: string | null;
  boundary: AreaPolygon;
}

export const AREAS_QUERY_KEY = ["gov", "areas"] as const;

export const listAreas = () =>
  apiRequest<{ areas: ManagedArea[] }>("/gov/areas").then(
    (response) => response.areas,
  );

export const createArea = (body: AreaInput) =>
  apiRequest<{ area: ManagedArea }>("/gov/areas", {
    method: "POST",
    body,
  }).then((response) => response.area);

export const updateArea = (id: number, body: Partial<AreaInput>) =>
  apiRequest<{ area: ManagedArea }>(`/gov/areas/${id}`, {
    method: "PATCH",
    body,
  }).then((response) => response.area);

export const deleteArea = (id: number) =>
  apiRequest<void>(`/gov/areas/${id}`, { method: "DELETE" });
