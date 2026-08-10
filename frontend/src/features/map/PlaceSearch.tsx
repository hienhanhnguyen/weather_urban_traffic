"use client";

import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Loader2, Search } from "lucide-react";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { PLACE_SEARCH_QUERY_KEY, searchPlaces, type GeoPlace } from "./api";

const MIN_QUERY_LENGTH = 2;

export interface PlaceSearchProps {
  onSelect: (place: GeoPlace) => void;
  focus?: { latitude: number; longitude: number };
  placeholder?: string;
}

export function PlaceSearch({
  onSelect,
  focus,
  placeholder,
}: PlaceSearchProps) {
  const t = useTranslations("mapFull.search");
  const tCommon = useTranslations("common");

  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const listboxId = useId();
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  const debounced = useDebouncedValue(text.trim());
  const enabled = debounced.length >= MIN_QUERY_LENGTH;

  const { data, isFetching, isError } = useQuery({
    queryKey: [
      ...PLACE_SEARCH_QUERY_KEY,
      debounced,
      focus?.latitude.toFixed(2),
      focus?.longitude.toFixed(2),
    ],
    queryFn: () =>
      searchPlaces({
        q: debounced,
        latitude: focus?.latitude,
        longitude: focus?.longitude,
      }),
    enabled,
    staleTime: 10 * 60 * 1000,
  });

  const places = enabled ? (data ?? []) : [];

  const choose = (place: GeoPlace) => {
    onSelect(place);
    setText(place.name);
    setOpen(false);
    setActiveIndex(-1);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (places.length === 0) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => {
        const next = current + step;
        if (next < 0) return places.length - 1;
        if (next >= places.length) return 0;
        return next;
      });
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      choose(places[activeIndex]);
    }
  };

  const showList = open && enabled && places.length > 0;

  return (
    <div className="relative">
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 opacity-50"
        />

        <input
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? optionId(activeIndex) : undefined
          }
          aria-label={t("placeholder")}
          placeholder={placeholder ?? t("placeholder")}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full rounded-md border border-border bg-background py-2 pr-9 pl-9 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        />

        {isFetching && (
          <Loader2
            aria-hidden="true"
            className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin opacity-50"
          />
        )}
      </div>

      <span aria-live="polite" className="sr-only">
        {showList ? t("results") : ""}
      </span>

      {showList && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={t("results")}
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-background shadow-lg"
        >
          {places.map((place, index) => (
            <li
              key={place.id}
              id={optionId(index)}
              role="option"
              aria-selected={index === activeIndex}
              onPointerDown={(event) => {
                event.preventDefault();
                choose(place);
              }}
              onPointerEnter={() => setActiveIndex(index)}
              className={
                "cursor-pointer px-3 py-2 text-sm " +
                (index === activeIndex ? "bg-sky-600/15" : "")
              }
            >
              <span className="block font-medium">{place.name}</span>
              {place.address && (
                <span className="block text-xs opacity-60">
                  {place.address}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {open && enabled && !isFetching && places.length === 0 && (
        <p
          role={isError ? "alert" : undefined}
          className={
            "absolute z-20 mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-lg " +
            (isError
              ? "border-red-600/40 text-red-700 dark:text-red-400"
              : "border-border opacity-70")
          }
        >
          {isError ? t("failed") : tCommon("noResults")}
        </p>
      )}
    </div>
  );
}
