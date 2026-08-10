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

export interface WeatherCondition {
  key: ConditionKey;
  icon: LucideIcon;
  nightIcon?: LucideIcon;
}

const CONDITIONS: Record<number, WeatherCondition> = {
  0: { key: "clear", icon: Sun, nightIcon: Moon },
  1: { key: "mainlyClear", icon: CloudSun, nightIcon: Cloud },
  2: { key: "partlyCloudy", icon: CloudSun, nightIcon: Cloud },
  3: { key: "overcast", icon: Cloudy },

  45: { key: "fog", icon: CloudFog },
  48: { key: "rimeFog", icon: CloudFog },

  51: { key: "drizzleLight", icon: CloudDrizzle },
  53: { key: "drizzleModerate", icon: CloudDrizzle },
  55: { key: "drizzleDense", icon: CloudDrizzle },
  56: { key: "freezingDrizzleLight", icon: CloudHail },
  57: { key: "freezingDrizzleDense", icon: CloudHail },

  61: { key: "rainSlight", icon: CloudRain },
  63: { key: "rainModerate", icon: CloudRain },
  65: { key: "rainHeavy", icon: CloudRainWind },
  66: { key: "freezingRainLight", icon: CloudHail },
  67: { key: "freezingRainHeavy", icon: CloudHail },

  71: { key: "snowSlight", icon: CloudSnow },
  73: { key: "snowModerate", icon: CloudSnow },
  75: { key: "snowHeavy", icon: CloudSnow },
  77: { key: "snowGrains", icon: Snowflake },

  80: { key: "showersSlight", icon: CloudRain },
  81: { key: "showersModerate", icon: CloudRain },
  82: { key: "showersViolent", icon: CloudRainWind },
  85: { key: "snowShowersSlight", icon: CloudSnow },
  86: { key: "snowShowersHeavy", icon: CloudSnow },

  95: { key: "thunderstorm", icon: CloudLightning },
  96: { key: "thunderstormHailSlight", icon: CloudLightning },
  99: { key: "thunderstormHailHeavy", icon: CloudLightning },
};

const UNKNOWN: WeatherCondition = { key: "unknown", icon: Cloud };

export function conditionFor(code: number | null): WeatherCondition {
  return code === null ? UNKNOWN : (CONDITIONS[code] ?? UNKNOWN);
}

const POINTS = ["n", "ne", "e", "se", "s", "sw", "w", "nw"] as const;

export function compassFor(degrees: number | null): (typeof POINTS)[number] | null {
  if (degrees === null) return null;
  const index = Math.round(((degrees % 360) + 360) % 360 / 45) % POINTS.length;
  return POINTS[index];
}
