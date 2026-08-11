import type { WeatherPlace } from "./PlaceSelector";

const LABEL_MAX = 255;

export function weatherHrefFor(place: {
  latitude: number;
  longitude: number;
  label: string;
}): string {
  const params = new URLSearchParams({
    lat: String(place.latitude),
    lng: String(place.longitude),
  });

  if (place.label) params.set("label", place.label);

  return `/weather?${params.toString()}`;
}

export function parsePlaceLink(params: URLSearchParams): WeatherPlace | null {
  const latitude = Number(params.get("lat"));
  const longitude = Number(params.get("lng"));

  const usable =
    params.has("lat") &&
    params.has("lng") &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;

  if (!usable) return null;

  return {
    latitude,
    longitude,
    label: (params.get("label") ?? "").slice(0, LABEL_MAX),
  };
}
