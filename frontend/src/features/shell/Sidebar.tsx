"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { useSession } from "@/lib/auth/session";
import { isActive, visibleSections } from "./nav";
import { useSidebar } from "./sidebar-state";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useSession();
  const { collapsed } = useSidebar();
  const pathname = usePathname();

  if (!user) return null;

  return (
    <nav aria-label="Main" className="flex flex-col gap-6 px-2 py-4">
      {visibleSections(user).map((section) => (
        <div key={section.id} className="flex flex-col gap-1">
          {section.label && !collapsed && (
            <h2 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide opacity-50">
              {section.label}
            </h2>
          )}

          {section.items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors " +
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 " +
                  (active
                    ? "bg-sky-600/10 font-medium text-sky-700 dark:text-sky-300"
                    : "hover:bg-black/5 dark:hover:bg-white/10")
                }
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                <span className={collapsed ? "sr-only" : undefined}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function Sidebar() {
  const { collapsed, toggleCollapsed, mobileOpen, closeMobile } = useSidebar();

  useEffect(() => {
    if (!mobileOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobile();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, closeMobile]);

  return (
    <>
      {/* Desktop */}
      <aside
        className={
          "hidden shrink-0 border-r border-border bg-surface transition-[width] md:block " +
          (collapsed ? "w-16" : "w-60")
        }
      >
        <div className="sticky top-0 flex h-dvh flex-col">
          <div className="flex-1 overflow-y-auto">
            <NavLinks />
          </div>

          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            className="flex items-center gap-3 border-t border-border px-5 py-3 text-sm opacity-70 hover:opacity-100"
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden="true" className="size-4" />
            ) : (
              <PanelLeftClose aria-hidden="true" className="size-4" />
            )}
            <span className={collapsed ? "sr-only" : undefined}>Collapse</span>
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeMobile}
            className="absolute inset-0 bg-black/50"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Main menu"
            className="absolute inset-y-0 left-0 w-64 overflow-y-auto border-r border-border bg-background"
          >
            <div className="flex justify-end p-2">
              <button
                type="button"
                onClick={closeMobile}
                aria-label="Close menu"
                className="rounded-md p-2 hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>

            <NavLinks onNavigate={closeMobile} />
          </div>
        </div>
      )}
    </>
  );
}
