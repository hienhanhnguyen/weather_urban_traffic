const OPENFREEMAP = "https://tiles.openfreemap.org/styles";

export const MAP_STYLE_LIGHT =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? `${OPENFREEMAP}/liberty`;

export const MAP_STYLE_DARK =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL_DARK ?? `${OPENFREEMAP}/dark`;

export const DEFAULT_CENTER = { longitude: 106.6297, latitude: 10.8231 };
export const DEFAULT_ZOOM = 12;

export const DETAIL_ZOOM = 14;

export const ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> · ' +
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';
