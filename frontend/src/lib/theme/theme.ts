export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "swtis.theme";

const DEFAULT_PREFERENCE: ThemePreference = "system";

const listeners = new Set<() => void>();

let cache: ThemePreference | null = null;

function isPreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function read(): ThemePreference {
  if (typeof window === "undefined") return DEFAULT_PREFERENCE;

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isPreference(stored) ? stored : DEFAULT_PREFERENCE;
}

function emit(): void {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent): void {
  if (event.key !== null && event.key !== THEME_STORAGE_KEY) return;

  cache = read();
  emit();
}

export function getPreference(): ThemePreference {
  cache ??= read();
  return cache;
}

// useSyncExternalStore needs a snapshot that never changes identity during SSR.
export function getServerPreference(): ThemePreference {
  return DEFAULT_PREFERENCE;
}

export function setPreference(preference: ThemePreference): void {
  cache = preference;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
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

export function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function subscribeToSystemTheme(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const query = window.matchMedia("(prefers-color-scheme: dark)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

export function applyTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

export const THEME_BOOTSTRAP_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var dark = stored === 'dark' || ((!stored || stored === 'system') &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {}
})();
`;
