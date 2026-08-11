import { Suspense } from "react";
import { MapExplorer } from "@/features/map/MapExplorer";

export default function MapPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[70vh] animate-pulse rounded-lg bg-surface" />
      }
    >
      <MapExplorer />
    </Suspense>
  );
}
