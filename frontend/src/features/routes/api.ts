import { apiRequest } from "@/lib/api/client";
import type { SavedLocation } from "@/features/locations/api";
import type { RouteProfile } from "@/features/map/api";

export interface RouteEndpoint {
  latitude: number;
  longitude: number;
  address: string | null;
}

export interface SavedRoute {
  id: number;
  name: string;
  start: RouteEndpoint;
  end: RouteEndpoint;
  profile: RouteProfile;
  distanceM: number | null;
  durationS: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavedRoutePage {
  routes: SavedRoute[];
  pagination: { page: number; limit: number; total: number };
}

export interface RouteEndpointInput {
  latitude: number;
  longitude: number;
  address?: string | null;
}

export interface CreateRouteInput {
  name: string;
  start: RouteEndpointInput;
  end: RouteEndpointInput;
  profile: RouteProfile;
  distance_m?: number | null;
  duration_s?: number | null;
  // When present the backend also saves both ends as ordinary locations, in
  // the same transaction, so alert rules can be attached to them.
  save_endpoints?: { start_name: string; end_name: string };
}

export const SAVED_ROUTES_QUERY_KEY = ["routes"] as const;

export const ROUTES_PAGE_SIZE = 20;

export const routesQueryKey = (page: number) =>
  [...SAVED_ROUTES_QUERY_KEY, "list", page] as const;

export const listRoutes = (page = 1) =>
  apiRequest<SavedRoutePage>("/routes", {
    query: { page, limit: ROUTES_PAGE_SIZE },
  });

export const createRoute = (body: CreateRouteInput) =>
  apiRequest<{ route: SavedRoute; locations: SavedLocation[] }>("/routes", {
    method: "POST",
    body,
  });

export const renameRoute = (id: number, name: string) =>
  apiRequest<{ route: SavedRoute }>(`/routes/${id}`, {
    method: "PATCH",
    body: { name },
  }).then((response) => response.route);

export const deleteRoute = (id: number) =>
  apiRequest<void>(`/routes/${id}`, { method: "DELETE" });

export const ROUTE_LIMIT_REACHED_CODE = "ROUTE_LIMIT_REACHED";
