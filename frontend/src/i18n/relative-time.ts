"use client";

import { useFormatter, useNow } from "next-intl";

const UPDATE_INTERVAL = 60_000;

export function useRelativeTime(): (value: Date | number) => string {
  const format = useFormatter();
  const now = useNow({ updateInterval: UPDATE_INTERVAL });

  return (value) => format.relativeTime(value, now);
}
