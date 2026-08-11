import { apiRequest } from "@/lib/api/client";
import type { RouteProfile } from "@/features/map/api";
import type { RouteEndpoint, RouteEndpointInput } from "@/features/routes/api";

export interface RouteSearchEntry {
  id: number;
  start: RouteEndpoint;
  end: RouteEndpoint;
  profile: RouteProfile;
  distanceM: number | null;
  durationS: number | null;
  searchedAt: string;
}

export interface WeatherSearchEntry {
  id: number;
  locationId: number | null;
  label: string;
  latitude: number;
  longitude: number;
  temperatureC: number | null;
  condition: string | null;
  searchedAt: string;
}

export interface SearchPage<T> {
  searches: T[];
  pagination: { page: number; limit: number; total: number };
}

export interface SearchQuery {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
}

export interface RouteSearchInput {
  start: RouteEndpointInput;
  end: RouteEndpointInput;
  profile: RouteProfile;
  distance_m?: number | null;
  duration_s?: number | null;
}

export interface WeatherSearchInput {
  location_id?: number | null;
  label: string;
  latitude: number;
  longitude: number;
  temperature_c?: number | null;
  condition?: string | null;
}

export const ROUTE_SEARCHES_QUERY_KEY = ["history", "routes"] as const;
export const WEATHER_SEARCHES_QUERY_KEY = ["history", "weather"] as const;

export const SEARCHES_PAGE_SIZE = 20;

const windowQuery = ({
  page = 1,
  limit = SEARCHES_PAGE_SIZE,
  from,
  to,
}: SearchQuery) => ({
  page,
  limit,
  ...(from !== undefined && { from }),
  ...(to !== undefined && { to }),
});

export const routeSearchesQueryKey = (query: SearchQuery) =>
  [...ROUTE_SEARCHES_QUERY_KEY, "list", query] as const;

export const weatherSearchesQueryKey = (query: SearchQuery) =>
  [...WEATHER_SEARCHES_QUERY_KEY, "list", query] as const;

export const listRouteSearches = (query: SearchQuery = {}) =>
  apiRequest<SearchPage<RouteSearchEntry>>("/history/routes", {
    query: windowQuery(query),
  });

export const recordRouteSearch = (body: RouteSearchInput) =>
  apiRequest<{ search: RouteSearchEntry }>("/history/routes", {
    method: "POST",
    body,
  }).then((response) => response.search);

export const clearRouteSearches = () =>
  apiRequest<{ deleted: number }>("/history/routes", { method: "DELETE" });

export const listWeatherSearches = (query: SearchQuery = {}) =>
  apiRequest<SearchPage<WeatherSearchEntry>>("/history/weather", {
    query: windowQuery(query),
  });

export const recordWeatherSearch = (body: WeatherSearchInput) =>
  apiRequest<{ search: WeatherSearchEntry }>("/history/weather", {
    method: "POST",
    body,
  }).then((response) => response.search);

export const clearWeatherSearches = () =>
  apiRequest<{ deleted: number }>("/history/weather", { method: "DELETE" });
