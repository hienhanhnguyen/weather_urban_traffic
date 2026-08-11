"use client";

import { useQueries } from "@tanstack/react-query";
import {
  currentQueryKey,
  getCurrent,
  type CurrentWeather,
} from "@/features/weather/api";
import { conditionFor, worstSeverity, type Severity } from "@/features/weather/wmo";
import { splitRoute, type Position, type RouteSegment } from "./geometry";

export const SEGMENT_COUNT = 5;

const STALE_TIME = 10 * 60 * 1000;

export interface SegmentConditions {
  segment: RouteSegment;
  weather: CurrentWeather | null;
  severity: Severity;
}

export interface RouteConditions {
  segments: SegmentConditions[];
  isPending: boolean;
  isError: boolean;
  overall: Severity;
  affected: number;
  total: number;
}
export function useRouteConditions(
  coordinates: Position[] | null,
  { enabled = true }: { enabled?: boolean } = {},
): RouteConditions {
  const segments = coordinates ? splitRoute(coordinates, SEGMENT_COUNT) : [];

  const results = useQueries({
    queries: segments.map((segment) => {
      const point = {
        latitude: segment.midpoint[1],
        longitude: segment.midpoint[0],
      };

      return {
        queryKey: currentQueryKey(point, "metric" as const),
        queryFn: () => getCurrent(point),
        staleTime: STALE_TIME,
        enabled,
      };
    }),
  });

  const conditions = segments.map((segment, index) => {
    const weather = results[index]?.data ?? null;

    return {
      segment,
      weather,
      severity: conditionFor(weather?.weatherCode ?? null).severity,
    };
  });

  const overall = worstSeverity(conditions.map((entry) => entry.severity));

  return {
    segments: conditions,
    isPending: results.some((result) => result.isPending),
    isError: results.some((result) => result.isError),
    overall,
    affected: conditions.filter((entry) => entry.severity === overall).length,
    total: conditions.length,
  };
}
