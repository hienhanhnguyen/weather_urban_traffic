export type Position = [number, number];

const EARTH_RADIUS_M = 6_371_008.8;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversine([lngA, latA]: Position, [lngB, latB]: Position) {
  const dLat = toRadians(latB - latA);
  const dLng = toRadians(lngB - lngA);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(latA)) *
      Math.cos(toRadians(latB)) *
      Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

function cumulativeDistances(coordinates: Position[]): number[] {
  const totals = [0];
  for (let index = 1; index < coordinates.length; index += 1) {
    totals.push(
      totals[index - 1] + haversine(coordinates[index - 1], coordinates[index]),
    );
  }
  return totals;
}

const lerp = (a: number, b: number, ratio: number) => a + (b - a) * ratio;

export function pointAt(
  coordinates: Position[],
  totals: number[],
  distance: number,
): Position {
  if (distance <= 0) return coordinates[0];

  const last = coordinates.length - 1;
  if (distance >= totals[last]) return coordinates[last];

  let index = 1;
  while (index < last && totals[index] < distance) index += 1;

  const span = totals[index] - totals[index - 1];
  const ratio = span === 0 ? 0 : (distance - totals[index - 1]) / span;
  const [lngA, latA] = coordinates[index - 1];
  const [lngB, latB] = coordinates[index];

  return [lerp(lngA, lngB, ratio), lerp(latA, latB, ratio)];
}

export interface RouteSegment {
  coordinates: Position[];
  /** Where this segment's conditions get sampled and its marker drawn. */
  midpoint: Position;
}

export function splitRoute(
  coordinates: Position[],
  parts: number,
): RouteSegment[] {
  if (coordinates.length < 2 || parts < 1) return [];

  const totals = cumulativeDistances(coordinates);
  const total = totals[totals.length - 1];

  if (total === 0) return [];

  const step = total / parts;
  const segments: RouteSegment[] = [];

  for (let part = 0; part < parts; part += 1) {
    const from = part * step;
    const to = (part + 1) * step;

    const inner = coordinates.filter(
      (_, index) => totals[index] > from && totals[index] < to,
    );

    segments.push({
      coordinates: [
        pointAt(coordinates, totals, from),
        ...inner,
        pointAt(coordinates, totals, to),
      ],
      midpoint: pointAt(coordinates, totals, from + step / 2),
    });
  }

  return segments;
}

export type Bounds = [[number, number], [number, number]];

export function boundsOf(coordinates: Position[]): Bounds | null {
  if (coordinates.length === 0) return null;

  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;

  for (const [lng, lat] of coordinates) {
    west = Math.min(west, lng);
    south = Math.min(south, lat);
    east = Math.max(east, lng);
    north = Math.max(north, lat);
  }

  return [
    [west, south],
    [east, north],
  ];
}
