import { apiRequest } from "@/lib/api/client";

export interface SavedLocation {
  id: number;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  createdAt: string;
}

export interface LocationPage {
  locations: SavedLocation[];
  pagination: { page: number; limit: number; total: number };
}

export interface LocationInput {
  custom_name: string;
  address: string | null;
  latitude: number;
  longitude: number;
}

export const LOCATIONS_QUERY_KEY = ["locations"] as const;

export const LOCATIONS_PAGE_SIZE = 100;

export const listLocations = () =>
  apiRequest<LocationPage>("/locations", {
    query: { page: 1, limit: LOCATIONS_PAGE_SIZE },
  });

export const createLocation = (body: LocationInput) =>
  apiRequest<{ location: SavedLocation }>("/locations", {
    method: "POST",
    body,
  }).then((response) => response.location);

export const updateLocation = (id: number, body: Partial<LocationInput>) =>
  apiRequest<{ location: SavedLocation }>(`/locations/${id}`, {
    method: "PATCH",
    body,
  }).then((response) => response.location);

export const deleteLocation = (id: number) =>
  apiRequest<void>(`/locations/${id}`, { method: "DELETE" });

export const LIMIT_REACHED_CODE = "LOCATION_LIMIT_REACHED";
