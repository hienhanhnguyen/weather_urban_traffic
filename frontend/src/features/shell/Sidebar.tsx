"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { useSession } from "@/lib/auth/session";
import { isActive, visibleSections } from "./nav";
import { useSidebar } from "./sidebar-state";

function NavLinks({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations("nav");
  const { user } = useSession();
  const pathname = usePathname();

  if (!user) return null;

  return (
    <nav aria-label={t("main")} className="flex flex-col gap-6 px-2 py-4">
      {visibleSections(user).map((section) => (
        <div key={section.id} className="flex flex-col gap-1">
          {section.labelKey && !collapsed && (
            <h2 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide opacity-50">
              {t(`sections.${section.labelKey}`)}
            </h2>
          )}

          {section.items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            const label = t(`items.${item.labelKey}`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                title={collapsed ? label : undefined}
                className={
                  "flex items-center rounded-md py-2 text-sm transition-colors " +
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 " +
                  // The label is `sr-only` when collapsed, so the icon is the
                  // only thing left in the row: drop the text indent and let
                  // it sit on the rail's centre line.
                  (collapsed ? "justify-center px-0 " : "gap-3 px-3 ") +
                  (active
                    ? "bg-sky-600/10 font-medium text-sky-700 dark:text-sky-300"
                    : "hover:bg-black/5 dark:hover:bg-white/10")
                }
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                <span className={collapsed ? "sr-only" : undefined}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function MobileDrawer() {
  const t = useTranslations("nav");
  const { mobileOpen, closeMobile } = useSidebar();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (mobileOpen && !dialog.open) dialog.showModal();
    if (!mobileOpen && dialog.open) dialog.close();
  }, [mobileOpen]);

  return (
    <dialog
      ref={ref}
      aria-label={t("main")}
      onClose={closeMobile}
      onClick={(event) => {
        if (event.target === ref.current) closeMobile();
      }}
      className={
        "mr-auto ml-0 h-dvh max-h-dvh w-64 max-w-[80vw] overflow-y-auto " +
        "border-r border-border bg-background p-0 text-foreground " +
        "backdrop:bg-black/50 md:hidden"
      }
    >
      <div className="flex justify-end p-2">
        <button
          type="button"
          onClick={closeMobile}
          aria-label={t("closeMenu")}
          className="rounded-md p-2 hover:bg-black/5 dark:hover:bg-white/10"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>

      <NavLinks onNavigate={closeMobile} />
    </dialog>
  );
}

export function Sidebar() {
  const t = useTranslations("nav");
  const { collapsed, toggleCollapsed } = useSidebar();

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
          <div className="flex h-16 shrink-0 items-center border-b border-border px-2">
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-expanded={!collapsed}
              title={collapsed ? t("expand") : undefined}
              className={
                "flex w-full items-center rounded-md py-2 text-sm opacity-70 transition-colors " +
                "hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10 " +
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 " +
                (collapsed ? "justify-center px-0" : "gap-3 px-3")
              }
            >
              {collapsed ? (
                <PanelLeftOpen aria-hidden="true" className="size-4 shrink-0" />
              ) : (
                <PanelLeftClose
                  aria-hidden="true"
                  className="size-4 shrink-0"
                />
              )}
              <span className={collapsed ? "sr-only" : undefined}>
                {collapsed ? t("expand") : t("collapse")}
              </span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <NavLinks collapsed={collapsed} />
          </div>
        </div>
      </aside>

      <MobileDrawer />
    </>
  );
}
