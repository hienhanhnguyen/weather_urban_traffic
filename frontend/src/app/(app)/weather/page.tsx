import { Suspense } from "react";
import { WeatherPanel } from "@/features/weather/WeatherPanel";

export default function WeatherPage() {
  return (
    <Suspense
      fallback={<div className="h-96 animate-pulse rounded-lg bg-surface" />}
    >
      <WeatherPanel />
    </Suspense>
  );
}
