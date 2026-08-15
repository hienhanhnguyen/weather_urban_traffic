"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, LogOut, UserCog } from "lucide-react";
import { useSession } from "@/lib/auth/session";

const ITEM =
  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm " +
  "hover:bg-black/5 dark:hover:bg-white/10";

export function UserMenu() {
  const t = useTranslations();
  const { user, signOut } = useSession();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const name = user?.username ?? user?.email ?? "";
  const accountType = user ? t(`accountType.${user.accountType}`) : "";

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    router.replace("/login");
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-md p-1.5 hover:bg-black/5 dark:hover:bg-white/10"
      >
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-full bg-sky-600 text-xs font-semibold text-white"
        >
          {name.slice(0, 1).toUpperCase()}
        </span>

        <span className="sr-only sm:hidden">{name}</span>

        <span className="hidden text-left text-sm leading-tight sm:block">
          <span className="block">{name}</span>
          {user && (
            <span className="block text-xs opacity-60">{accountType}</span>
          )}
        </span>

        <ChevronDown
          aria-hidden="true"
          className={
            "size-4 opacity-60 transition-transform " +
            (open ? "rotate-180" : "")
          }
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-md border border-border bg-background shadow-lg"
        >
          <div className="border-b border-border px-3 py-2 sm:hidden">
            <p className="truncate text-sm font-medium">{name}</p>
            {user && <p className="text-xs opacity-60">{accountType}</p>}
          </div>

          <Link
            role="menuitem"
            href="/account"
            onClick={() => setOpen(false)}
            className={ITEM}
          >
            <UserCog aria-hidden="true" className="size-4" />
            {t("nav.items.account")}
          </Link>

          <button
            role="menuitem"
            type="button"
            onClick={handleSignOut}
            className={ITEM}
          >
            <LogOut aria-hidden="true" className="size-4" />
            {t("common.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
