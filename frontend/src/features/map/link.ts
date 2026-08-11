import type { RouteProfile } from "./api";
import type { MapPoint } from "./types";

export interface RouteLink {
  origin: MapPoint;
  destination: MapPoint;
  profile: RouteProfile;
}

export interface LinkEndpoint {
  latitude: number;
  longitude: number;
  address?: string | null;
}

const PROFILES: readonly RouteProfile[] = ["driving", "cycling", "walking"];

const LABEL_MAX = 255;

const isProfile = (value: string | null): value is RouteProfile =>
  value !== null && PROFILES.includes(value as RouteProfile);

export function mapHrefFor(route: {
  start: LinkEndpoint;
  end: LinkEndpoint;
  profile: RouteProfile;
}): string {
  const params = new URLSearchParams({
    fromLat: String(route.start.latitude),
    fromLng: String(route.start.longitude),
    toLat: String(route.end.latitude),
    toLng: String(route.end.longitude),
    profile: route.profile,
  });

  if (route.start.address) params.set("from", route.start.address);
  if (route.end.address) params.set("to", route.end.address);

  return `/map?${params.toString()}`;
}

const point = (
  params: URLSearchParams,
  latKey: string,
  lngKey: string,
  labelKey: string,
): MapPoint | null => {
  const latitude = Number(params.get(latKey));
  const longitude = Number(params.get(lngKey));

  const usable =
    params.has(latKey) &&
    params.has(lngKey) &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;

  if (!usable) return null;

  return {
    latitude,
    longitude,
    label: (params.get(labelKey) ?? "").slice(0, LABEL_MAX),
  };
};

export function parseRouteLink(params: URLSearchParams): RouteLink | null {
  const origin = point(params, "fromLat", "fromLng", "from");
  const destination = point(params, "toLat", "toLng", "to");

  if (!origin || !destination) return null;

  const profile = params.get("profile");

  return {
    origin,
    destination,
    profile: isProfile(profile) ? profile : "driving",
  };
}
