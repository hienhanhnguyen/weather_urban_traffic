import { forwardRef, useId } from "react";
import type { InputHTMLAttributes } from "react";

export interface ToggleProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "type"
> {
  label: string;
  hint?: string;
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(function Toggle(
  { label, hint, className = "", ...rest },
  ref,
) {
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {hint && (
          <p id={hintId} className="text-sm opacity-70">
            {hint}
          </p>
        )}
      </div>

      <div className="relative inline-flex shrink-0 items-center">
        <input
          id={id}
          ref={ref}
          type="checkbox"
          role="switch"
          aria-describedby={hint ? hintId : undefined}
          className={`peer size-0 opacity-0 ${className}`}
          {...rest}
        />
        <label
          htmlFor={id}
          aria-hidden="true"
          className={
            "block h-6 w-11 cursor-pointer rounded-full bg-black/20 transition-colors " +
            "after:block after:size-5 after:translate-x-0.5 after:translate-y-0.5 after:rounded-full " +
            "after:bg-white after:transition-transform " +
            "peer-checked:bg-sky-600 peer-checked:after:translate-x-[1.375rem] " +
            "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 " +
            "peer-focus-visible:outline-sky-600 " +
            "peer-disabled:cursor-not-allowed peer-disabled:opacity-50 dark:bg-white/25"
          }
        />
      </div>
    </div>
  );
});
