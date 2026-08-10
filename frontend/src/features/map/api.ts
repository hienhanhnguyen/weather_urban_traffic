import { apiRequest } from "@/lib/api/client";

export interface GeoPlace {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string | null;
}

export interface GeoRoute {
  distanceMeters: number;
  durationSeconds: number;
  geometry: { type: "LineString"; coordinates: [number, number][] };
}

export type RouteProfile = "driving" | "walking" | "cycling";

export interface SearchParams {
  q: string;
  latitude?: number;
  longitude?: number;
  limit?: number;
}

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  return search.toString();
};

export const PLACE_SEARCH_QUERY_KEY = ["geo", "search"] as const;
export const REVERSE_GEOCODE_QUERY_KEY = ["geo", "reverse"] as const;
export const ROUTE_QUERY_KEY = ["geo", "route"] as const;

export const searchPlaces = ({ q, latitude, longitude, limit }: SearchParams) =>
  apiRequest<{ places: GeoPlace[] }>(
    `/geo/search?${query({ q, lat: latitude, lng: longitude, limit })}`,
  ).then((response) => response.places);

export const reverseGeocode = (latitude: number, longitude: number) =>
  apiRequest<{ place: GeoPlace | null }>(
    `/geo/reverse?${query({ lat: latitude, lng: longitude })}`,
  ).then((response) => response.place);

export const getRoute = (
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
  profile: RouteProfile = "driving",
) =>
  apiRequest<{ route: GeoRoute | null }>(
    `/geo/route?${query({
      fromLat: from.latitude,
      fromLng: from.longitude,
      toLat: to.latitude,
      toLng: to.longitude,
      profile,
    })}`,
  ).then((response) => response.route);
