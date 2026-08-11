"use client";

import {
  ROUTE_SEARCHES_QUERY_KEY,
  clearRouteSearches,
  listRouteSearches,
  routeSearchesQueryKey,
  type RouteSearchEntry,
} from "./api";
import { RouteSearchRow } from "./RouteSearchRow";
import { SearchHistoryPanel } from "./SearchHistoryPanel";
import { useSearchHistory } from "./useSearchHistory";

export function RouteSearchHistory() {
  const history = useSearchHistory<RouteSearchEntry>({
    baseKey: ROUTE_SEARCHES_QUERY_KEY,
    queryKey: routeSearchesQueryKey,
    list: listRouteSearches,
    clear: clearRouteSearches,
  });

  return (
    <SearchHistoryPanel
      namespace="history.routes"
      history={history}
      renderRow={(search) => (
        <RouteSearchRow key={search.id} search={search} />
      )}
    />
  );
}
