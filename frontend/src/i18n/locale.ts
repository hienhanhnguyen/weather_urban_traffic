import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";

export const LOCALE_STORAGE_KEY = "swtis.locale";

const listeners = new Set<() => void>();

let cache: Locale | null = null;

function read(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return isLocale(stored) ? stored : DEFAULT_LOCALE;
}

function emit(): void {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent): void {
  if (event.key !== null && event.key !== LOCALE_STORAGE_KEY) return;

  cache = read();
  emit();
}

export function getLocale(): Locale {
  cache ??= read();
  return cache;
}

export function getServerLocale(): Locale {
  return DEFAULT_LOCALE;
}

export function setLocale(locale: Locale): void {
  if (getLocale() === locale) return;

  cache = locale;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }

  emit();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  if (listeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}
