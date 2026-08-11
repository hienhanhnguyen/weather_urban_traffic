"use client";

import {
  WEATHER_SEARCHES_QUERY_KEY,
  clearWeatherSearches,
  listWeatherSearches,
  weatherSearchesQueryKey,
  type WeatherSearchEntry,
} from "./api";
import { SearchHistoryPanel } from "./SearchHistoryPanel";
import { useSearchHistory } from "./useSearchHistory";
import { WeatherSearchRow } from "./WeatherSearchRow";

export function WeatherSearchHistory() {
  const history = useSearchHistory<WeatherSearchEntry>({
    baseKey: WEATHER_SEARCHES_QUERY_KEY,
    queryKey: weatherSearchesQueryKey,
    list: listWeatherSearches,
    clear: clearWeatherSearches,
  });

  return (
    <SearchHistoryPanel
      namespace="history.weather"
      history={history}
      renderRow={(search) => (
        <WeatherSearchRow key={search.id} search={search} />
      )}
    />
  );
}
