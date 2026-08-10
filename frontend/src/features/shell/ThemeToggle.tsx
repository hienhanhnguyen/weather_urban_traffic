"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme/ThemeProvider";
import type { ThemePreference } from "@/lib/theme/theme";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="flex items-center gap-0.5 rounded-md border border-border p-0.5"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const selected = preference === value;

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            title={label}
            onClick={() => setPreference(value)}
            className={
              "rounded p-1.5 transition-colors " +
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 " +
              (selected
                ? "bg-sky-600/15 text-sky-700 dark:text-sky-300"
                : "opacity-60 hover:opacity-100")
            }
          >
            <Icon aria-hidden="true" className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
