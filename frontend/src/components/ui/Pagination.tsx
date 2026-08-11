"use client";

import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GAP, pageRange } from "./pageRange";

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  label: string;
}

const buttonBase =
  "inline-flex size-9 items-center justify-center rounded-md text-sm " +
  "disabled:opacity-40 disabled:pointer-events-none";

export function Pagination({
  page,
  totalPages,
  onPageChange,
  label,
}: PaginationProps) {
  const t = useTranslations("common.pagination");

  if (totalPages <= 1) return null;

  return (
    <nav aria-label={label} className="flex items-center justify-center gap-1">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label={t("prev")}
        className={`${buttonBase} border border-border hover:bg-black/5 dark:hover:bg-white/10`}
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
      </button>

      {pageRange(page, totalPages).map((slot, index) =>
        slot === GAP ? (
          <span
            key={`gap-${index}`}
            aria-hidden="true"
            className="inline-flex size-9 items-center justify-center opacity-50"
          >
            …
          </span>
        ) : (
          <button
            key={slot}
            type="button"
            onClick={() => onPageChange(slot)}
            aria-label={t("page", { page: slot })}
            aria-current={slot === page ? "page" : undefined}
            className={
              `${buttonBase} ` +
              (slot === page
                ? "bg-sky-600 font-semibold text-white"
                : "hover:bg-black/5 dark:hover:bg-white/10")
            }
          >
            {slot}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label={t("next")}
        className={`${buttonBase} border border-border hover:bg-black/5 dark:hover:bg-white/10`}
      >
        <ChevronRight aria-hidden="true" className="size-4" />
      </button>
    </nav>
  );
}
