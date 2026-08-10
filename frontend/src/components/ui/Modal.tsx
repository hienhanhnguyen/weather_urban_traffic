"use client";

import { useEffect, useId, useRef } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

const WIDTHS = { md: "max-w-md", lg: "max-w-2xl" } as const;

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  size?: keyof typeof WIDTHS;
  children: React.ReactNode;
}

export function Modal({
  open,
  title,
  onClose,
  size = "md",
  children,
}: ModalProps) {
  const t = useTranslations("common");
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={`m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] ${WIDTHS[size]} overflow-y-auto rounded-lg border border-border bg-background p-0 text-foreground backdrop:bg-black/50`}
    >
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
        <h2 id={titleId} className="text-sm font-semibold">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="rounded-md p-1.5 hover:bg-black/5 dark:hover:bg-white/10"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>

      <div className="px-5 py-4">{children}</div>
    </dialog>
  );
}
