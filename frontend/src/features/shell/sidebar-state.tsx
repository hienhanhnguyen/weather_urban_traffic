"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

const STORAGE_KEY = "swtis.sidebarCollapsed";

const listeners = new Set<() => void>();

let cache: boolean | null = null;

function emit(): void {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent): void {
  if (event.key !== null && event.key !== STORAGE_KEY) return;

  cache = window.localStorage.getItem(STORAGE_KEY) === "true";
  emit();
}

function getCollapsed(): boolean {
  if (cache === null) {
    cache =
      typeof window !== "undefined" &&
      window.localStorage.getItem(STORAGE_KEY) === "true";
  }
  return cache;
}

const getServerCollapsed = (): boolean => false;

function subscribe(listener: () => void): () => void {
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

interface SidebarContextValue {
  // Desktop: the rail is narrowed to icons only.
  collapsed: boolean;
  toggleCollapsed: () => void;
  // Mobile: the drawer sits over the content.
  mobileOpen: boolean;
  openMobile: () => void;
  closeMobile: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const collapsed = useSyncExternalStore(
    subscribe,
    getCollapsed,
    getServerCollapsed,
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = useCallback(() => {
    cache = !getCollapsed();
    window.localStorage.setItem(STORAGE_KEY, String(cache));
    emit();
  }, []);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const value = useMemo<SidebarContextValue>(
    () => ({ collapsed, toggleCollapsed, mobileOpen, openMobile, closeMobile }),
    [collapsed, toggleCollapsed, mobileOpen, openMobile, closeMobile],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  const sidebar = useContext(SidebarContext);
  if (!sidebar) {
    throw new Error("useSidebar must be used inside <SidebarProvider>");
  }
  return sidebar;
}
