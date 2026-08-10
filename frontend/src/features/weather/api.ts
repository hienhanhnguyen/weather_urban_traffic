import { apiRequest } from "@/lib/api/client";

export type Units = "metric" | "imperial";

export interface WeatherUnits {
  temp: string;
  wind: string;
  precip: string;
}

export interface WeatherPlace {
  coordinates: { latitude: number; longitude: number };
  timezone: string;
  utcOffsetSeconds: number;
  units: WeatherUnits;
}

export interface CurrentWeather extends WeatherPlace {
  observedAt: string | null;
  isDay: boolean;
  weatherCode: number | null;
  temp: number | null;
  feelsLike: number | null;
  humidity: number | null;
  precip: number | null;
  precipProb: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  pressure: number | null;
}

export interface HourlySlot {
  time: string | null;
  temp: number | null;
  feelsLike: number | null;
  precip: number | null;
  precipProb: number | null;
  weatherCode: number | null;
}

export interface DailySlot {
  date: string | null;
  weatherCode: number | null;
  tempMin: number | null;
  tempMax: number | null;
  precipSum: number | null;
  precipProbMax: number | null;
  sunrise: string | null;
  sunset: string | null;
}

export interface Forecast extends WeatherPlace {
  hourly: HourlySlot[];
  daily: DailySlot[];
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

const grid = (value: number) => value.toFixed(2);

export const currentQueryKey = (point: Coordinates, units: Units) =>
  ["weather", "current", grid(point.latitude), grid(point.longitude), units] as const;

export const forecastQueryKey = (point: Coordinates, units: Units) =>
  ["weather", "forecast", grid(point.latitude), grid(point.longitude), units] as const;

export const getCurrent = (point: Coordinates, units: Units = "metric") =>
  apiRequest<{ current: CurrentWeather }>("/weather/current", {
    query: { lat: point.latitude, lon: point.longitude, units },
  }).then((response) => response.current);

export const getForecast = (point: Coordinates, units: Units = "metric") =>
  apiRequest<Forecast>("/weather/forecast", {
    query: { lat: point.latitude, lon: point.longitude, units },
  });
