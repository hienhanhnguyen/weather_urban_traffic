export function FullPageSpinner({ label = "Loading" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[50vh] flex-1 items-center justify-center"
    >
      <span
        aria-hidden="true"
        className="size-8 animate-spin rounded-full border-2 border-current border-t-transparent opacity-40"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
