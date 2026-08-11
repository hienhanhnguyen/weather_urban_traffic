export interface Frame {
  x: number;
  y: number;
  width: number;
  height: number;
}

const PRECISION = 1e6;

const round = (value: number) => Math.round(value * PRECISION) / PRECISION;

function niceStep(range: number): number {
  const exponent = Math.floor(Math.log10(range));
  const power = 10 ** exponent;
  const fraction = range / power;

  if (fraction <= 1) return power;
  if (fraction <= 2) return 2 * power;
  if (fraction <= 5) return 5 * power;
  return 10 * power;
}

export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];

  const [low, high] = min === max ? [min - 1, max + 1] : [min, max];

  const step = niceStep((high - low) / Math.max(count - 1, 1));
  const start = Math.floor(low / step) * step;
  const end = Math.ceil(high / step) * step;

  const ticks: number[] = [];
  for (let value = start; value <= end + step / 2; value += step) {
    ticks.push(round(value));
  }

  return ticks;
}

export type Domain = [number, number];

export function domainOf(values: (number | null)[], includeZero = false): Domain {
  const numbers = values.filter((value): value is number => value !== null);
  if (numbers.length === 0) return [0, 1];

  const min = Math.min(...numbers, ...(includeZero ? [0] : []));
  const max = Math.max(...numbers, ...(includeZero ? [0] : []));

  return [min, max];
}

export function scaleValue(value: number, domain: Domain, frame: Frame): number {
  const [low, high] = domain;
  if (high === low) return frame.y + frame.height;

  const ratio = (value - low) / (high - low);
  return round(frame.y + frame.height - ratio * frame.height);
}

export function bandCenters(count: number, frame: Frame): number[] {
  if (count <= 0) return [];

  const band = frame.width / count;
  return Array.from({ length: count }, (_, index) =>
    round(frame.x + (index + 0.5) * band),
  );
}

export function labelStride(count: number, fit: number): number {
  if (count <= fit || fit <= 0) return 1;
  return Math.ceil(count / fit);
}

export function columnWidths(weights: number[], total: number): number[] {
  const sum = weights.reduce((carry, weight) => carry + weight, 0);
  if (sum <= 0) return weights.map(() => 0);

  const widths = weights.map((weight) => round((weight / sum) * total));

  const used = widths.slice(0, -1).reduce((carry, width) => carry + width, 0);
  widths[widths.length - 1] = round(total - used);

  return widths;
}
