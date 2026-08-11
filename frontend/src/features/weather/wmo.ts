import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudHail,
  CloudLightning,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  CloudSun,
  Cloudy,
  Moon,
  Snowflake,
  Sun,
  type LucideIcon,
} from "lucide-react";
import type { Messages } from "@/i18n/messages";

type ConditionKey = keyof Messages["weather"]["conditions"];

export type Severity = "clear" | "caution" | "severe";

export interface WeatherCondition {
  key: ConditionKey;
  icon: LucideIcon;
  nightIcon?: LucideIcon;
  severity: Severity;
}

const CONDITIONS: Record<number, WeatherCondition> = {
  0: { key: "clear", icon: Sun, nightIcon: Moon, severity: "clear" },
  1: { key: "mainlyClear", icon: CloudSun, nightIcon: Cloud, severity: "clear" },
  2: { key: "partlyCloudy", icon: CloudSun, nightIcon: Cloud, severity: "clear" },
  3: { key: "overcast", icon: Cloudy, severity: "clear" },

  45: { key: "fog", icon: CloudFog, severity: "caution" },
  48: { key: "rimeFog", icon: CloudFog, severity: "caution" },

  51: { key: "drizzleLight", icon: CloudDrizzle, severity: "caution" },
  53: { key: "drizzleModerate", icon: CloudDrizzle, severity: "caution" },
  55: { key: "drizzleDense", icon: CloudDrizzle, severity: "caution" },
  56: { key: "freezingDrizzleLight", icon: CloudHail, severity: "severe" },
  57: { key: "freezingDrizzleDense", icon: CloudHail, severity: "severe" },

  61: { key: "rainSlight", icon: CloudRain, severity: "caution" },
  63: { key: "rainModerate", icon: CloudRain, severity: "caution" },
  65: { key: "rainHeavy", icon: CloudRainWind, severity: "severe" },
  66: { key: "freezingRainLight", icon: CloudHail, severity: "severe" },
  67: { key: "freezingRainHeavy", icon: CloudHail, severity: "severe" },

  71: { key: "snowSlight", icon: CloudSnow, severity: "caution" },
  73: { key: "snowModerate", icon: CloudSnow, severity: "caution" },
  75: { key: "snowHeavy", icon: CloudSnow, severity: "severe" },
  77: { key: "snowGrains", icon: Snowflake, severity: "caution" },

  80: { key: "showersSlight", icon: CloudRain, severity: "caution" },
  81: { key: "showersModerate", icon: CloudRain, severity: "caution" },
  82: { key: "showersViolent", icon: CloudRainWind, severity: "severe" },
  85: { key: "snowShowersSlight", icon: CloudSnow, severity: "caution" },
  86: { key: "snowShowersHeavy", icon: CloudSnow, severity: "severe" },

  95: { key: "thunderstorm", icon: CloudLightning, severity: "severe" },
  96: { key: "thunderstormHailSlight", icon: CloudLightning, severity: "severe" },
  99: { key: "thunderstormHailHeavy", icon: CloudLightning, severity: "severe" },
};

const UNKNOWN: WeatherCondition = {
  key: "unknown",
  icon: Cloud,
  severity: "clear",
};

export function conditionFor(code: number | null): WeatherCondition {
  return code === null ? UNKNOWN : (CONDITIONS[code] ?? UNKNOWN);
}

export const wmoTag = (code: number | null) =>
  code === null ? null : `wmo:${code}`;

export function codeFromTag(tag: string | null): number | null {
  const match = /^wmo:(\d+)$/.exec(tag ?? "");
  return match ? Number(match[1]) : null;
}

const RANK: Record<Severity, number> = { clear: 0, caution: 1, severe: 2 };

export function worstSeverity(severities: Severity[]): Severity {
  return severities.reduce<Severity>(
    (worst, current) => (RANK[current] > RANK[worst] ? current : worst),
    "clear",
  );
}

const POINTS = ["n", "ne", "e", "se", "s", "sw", "w", "nw"] as const;

export function compassFor(degrees: number | null): (typeof POINTS)[number] | null {
  if (degrees === null) return null;
  const index = Math.round(((degrees % 360) + 360) % 360 / 45) % POINTS.length;
  return POINTS[index];
}
