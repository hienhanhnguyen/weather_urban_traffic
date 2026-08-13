"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { LOCATIONS_QUERY_KEY, listLocations } from "@/features/locations/api";
import { REVERSE_GEOCODE_QUERY_KEY, reverseGeocode } from "@/features/map/api";
import {
  WEATHER_SEARCHES_QUERY_KEY,
  recordWeatherSearch,
} from "@/features/history/api";
import { parsePlaceLink } from "./link";
import { wmoTag } from "./wmo";
import {
  currentQueryKey,
  forecastQueryKey,
  getCurrent,
  getForecast,
} from "./api";
import { CurrentWeatherCard } from "./CurrentWeatherCard";
import { DailyForecast } from "./DailyForecast";
import { HourlyStrip } from "./HourlyStrip";
import { PlaceSelector, type WeatherPlace } from "./PlaceSelector";

const STALE_TIME = 5 * 60 * 1000;

export function WeatherPanel() {
  const t = useTranslations("weather");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();

  const params = useSearchParams();
  const [chosen, setChosen] = useState<WeatherPlace | null>(() =>
    parsePlaceLink(params),
  );

  const saved = useQuery({
    queryKey: LOCATIONS_QUERY_KEY,
    queryFn: listLocations,
  });

  const fallback = saved.data?.locations[0];
  const place: WeatherPlace | null =
    chosen ??
    (fallback
      ? {
          latitude: fallback.latitude,
          longitude: fallback.longitude,
          label: fallback.name,
          address: fallback.address,
        }
      : null);

  const lookup = useQuery({
    queryKey: [
      ...REVERSE_GEOCODE_QUERY_KEY,
      place?.latitude ?? null,
      place?.longitude ?? null,
    ],
    queryFn:
      place && !place.address
        ? () => reverseGeocode(place.latitude, place.longitude)
        : skipToken,
    staleTime: STALE_TIME,
  });

  const address =
    place?.address ||
    lookup.data?.address ||
    lookup.data?.name ||
    place?.label ||
    t("unknownPlace");

  const current = useQuery({
    queryKey: place ? currentQueryKey(place, "metric") : ["weather", "current"],
    queryFn: place ? () => getCurrent(place) : skipToken,
    staleTime: STALE_TIME,
  });

  const forecast = useQuery({
    queryKey: place
      ? forecastQueryKey(place, "metric")
      : ["weather", "forecast"],
    queryFn: place ? () => getForecast(place) : skipToken,
    staleTime: STALE_TIME,
  });

  const failed = current.isError || forecast.isError;

  const recorder = useMutation({
    mutationFn: recordWeatherSearch,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: WEATHER_SEARCHES_QUERY_KEY }),
  });

  const looked =
    place && current.data ? `${place.latitude},${place.longitude}` : null;

  const recorded = useRef<string | null>(null);

  const record = useEffectEvent(() => {
    if (!place || !current.data) return;

    const match = saved.data?.locations.find(
      (location) =>
        location.latitude === place.latitude &&
        location.longitude === place.longitude,
    );

    recorder.mutate({
      location_id: match?.id ?? null,
      label: place.label || t("unknownPlace"),
      latitude: place.latitude,
      longitude: place.longitude,
      temperature_c: current.data.temp,
      condition: wmoTag(current.data.weatherCode),
    });
  });

  useEffect(() => {
    if (looked === null || recorded.current === looked) return;
    recorded.current = looked;
    record();
  }, [looked]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">{t("title")}</h1>
        <p className="text-sm opacity-70">
          {place ? place.label : t("subtitle")}
        </p>
      </div>

      <PlaceSelector value={place} onChange={setChosen} />

      {place === null && saved.isSuccess && (
        <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm font-medium">{t("noPlace")}</p>
          <p className="mt-1 text-sm opacity-70">{t("noPlaceHint")}</p>
        </div>
      )}

      {place !== null && (current.isPending || forecast.isPending) && (
        <p className="text-sm opacity-70">{tCommon("loading")}</p>
      )}

      {failed && (
        <Callout tone="error">
          {t("loadFailed")}{" "}
          <button
            type="button"
            onClick={() => {
              void current.refetch();
              void forecast.refetch();
            }}
            className="underline underline-offset-4"
          >
            {tCommon("tryAgain")}
          </button>
        </Callout>
      )}

      {current.data && (
        <CurrentWeatherCard current={current.data} address={address} />
      )}

      {forecast.data && (
        <>
          <HourlyStrip
            hourly={forecast.data.hourly}
            timezone={forecast.data.timezone}
            tempUnit={forecast.data.units.temp}
          />
          <DailyForecast
            daily={forecast.data.daily}
            timezone={forecast.data.timezone}
            tempUnit={forecast.data.units.temp}
          />
        </>
      )}

      {place !== null && (
        <div>
          <Button
            variant="secondary"
            onClick={() => {
              void current.refetch();
              void forecast.refetch();
            }}
            loading={current.isFetching || forecast.isFetching}
          >
            {tCommon("refresh")}
          </Button>
        </div>
      )}
    </div>
  );
}
