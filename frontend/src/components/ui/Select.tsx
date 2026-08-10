import { forwardRef, useId } from "react";
import type { SelectHTMLAttributes } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "children"> {
  label: string;
  options: readonly SelectOption[];
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ label, options, error, hint, className = "", ...rest }, ref) {
    const id = useId();
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>

        <select
          id={id}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={
            "rounded-md border bg-transparent px-3 py-2 text-sm outline-none " +
            "focus:ring-2 focus:ring-sky-600/40 " +
            (error
              ? "border-red-500 focus:border-red-500 "
              : "border-black/15 focus:border-sky-600 dark:border-white/20 ") +
            className
          }
          {...rest}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {error ? (
          <p id={errorId} className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-sm opacity-70">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
