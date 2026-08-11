"use client";

import { useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { pageCount } from "@/components/ui/pageRange";
import { SEARCHES_PAGE_SIZE, type SearchPage, type SearchQuery } from "./api";
import {
  EMPTY_RANGE,
  isRangeBackwards,
  toSearchQuery,
  type DateRange,
} from "./filters";

export interface SearchHistoryOptions<T> {
  baseKey: QueryKey;
  queryKey: (query: SearchQuery) => QueryKey;
  list: (query: SearchQuery) => Promise<SearchPage<T>>;
  clear: () => Promise<unknown>;
}

export function useSearchHistory<T>({
  baseKey,
  queryKey,
  list,
  clear,
}: SearchHistoryOptions<T>) {
  const queryClient = useQueryClient();

  const [range, setRange] = useState<DateRange>(EMPTY_RANGE);
  const [page, setPage] = useState(1);

  const backwards = isRangeBackwards(range);
  const params = toSearchQuery(range, page);

  const query = useQuery({
    queryKey: queryKey(params),
    queryFn: () => list(params),
    enabled: !backwards,
    placeholderData: keepPreviousData,
  });

  const clearAll = useMutation({
    mutationFn: clear,
    onSuccess: () => {
      setPage(1);
      return queryClient.invalidateQueries({ queryKey: baseKey });
    },
  });

  const total = query.data?.pagination.total ?? 0;

  return {
    range,
    changeRange: (next: DateRange) => {
      setRange(next);
      setPage(1);
    },
    resetRange: () => {
      setRange(EMPTY_RANGE);
      setPage(1);
    },
    page,
    setPage,
    backwards,
    query,
    clearAll,
    items: query.data?.searches ?? [],
    total,
    totalPages: pageCount(total, SEARCHES_PAGE_SIZE),
  };
}
