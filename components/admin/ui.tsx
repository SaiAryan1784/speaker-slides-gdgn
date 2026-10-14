"use client";

import { useId } from "react";

export const inputCls =
  "h-11 w-full rounded-[var(--radius-input)] border border-line-strong bg-surface px-3.5 text-base text-ink outline-none transition-[border-color,box-shadow] placeholder:text-muted focus:border-g-blue focus:shadow-[0_0_0_3px_var(--color-g-blue-tint)] aria-[invalid=true]:border-g-red";

export const btnPrimary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-g-blue px-6 text-sm font-medium text-white transition-transform hover:bg-g-blue-ink active:scale-[0.98] disabled:opacity-60";
export const btnSecondary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line-strong bg-surface px-5 text-sm font-medium transition-colors hover:border-ink active:scale-[0.98] disabled:opacity-60";
export const btnDanger =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-g-red/40 bg-surface px-5 text-sm font-medium text-g-red transition-colors hover:bg-g-red-tint active:scale-[0.98] disabled:opacity-60";

/** Label above the control, helper and error below it. Never placeholder-as-label. */
export function Field({
  label,
  error,
  help,
  required,
  children,
}: {
  label: string;
  error?: string;
  help?: string;
  required?: boolean;
  children: (p: { id: string; "aria-invalid": boolean; "aria-describedby": string | undefined }) => React.ReactNode;
}) {
  const id = useId();
  const descId = error || help ? `${id}-d` : undefined;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span className="text-g-red"> *</span>}
      </label>
      {children({ id, "aria-invalid": !!error, "aria-describedby": descId })}
      {error ? (
        <p id={descId} role="alert" className="text-sm text-g-red">
          {error}
        </p>
      ) : help ? (
        <p id={descId} className="text-sm text-muted">
          {help}
        </p>
      ) : null}
    </div>
  );
}
