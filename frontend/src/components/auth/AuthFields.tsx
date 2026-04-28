import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  id: string;
  error?: string;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
};

type AuthTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  id: string;
  error?: string;
  leftIcon?: ReactNode;
};

const baseControlClasses =
  "w-full rounded-2xl border bg-white/[0.04] px-4 py-3.5 text-sm leading-relaxed text-white placeholder:text-white/35 outline-none transition-all duration-200 ease-out backdrop-blur-sm shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),inset_0_0_0_1px_rgba(255,255,255,0.02)] hover:border-white/20 hover:bg-white/[0.06] focus:border-cyan-400/80 focus:bg-white/[0.06] focus:ring-4 focus:ring-cyan-500/15 focus:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-transparent";

const errorControlClasses =
  "border-rose-400/70 hover:border-rose-400/80 focus:border-rose-400 focus:ring-rose-500/20";

export function AuthTextField({
  label,
  id,
  error,
  leftIcon,
  rightSlot,
  className = "",
  ...props
}: AuthFieldProps) {
  const hasError = Boolean(error);

  return (
    <div className="space-y-2.5">
      <label
        htmlFor={id}
        className="block text-xs font-medium uppercase tracking-wider text-white/55"
      >
        {label}
      </label>
      <div className="relative">
        {leftIcon && (
          <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-white/50">
            {leftIcon}
          </div>
        )}
        <input
          id={id}
          aria-invalid={hasError}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`
            ${baseControlClasses}
            ${hasError ? errorControlClasses : "border-white/10"}
            ${leftIcon ? "pl-11" : ""}
            ${rightSlot ? "pr-12" : ""}
            ${className}
          `}
          {...props}
        />
        {rightSlot && (
          <div className="absolute inset-y-0 right-4 flex items-center">
            {rightSlot}
          </div>
        )}
      </div>
      {error && (
        <p
          id={`${id}-error`}
          className="flex items-center gap-1.5 text-xs font-medium text-rose-300"
        >
          <svg
            className="h-3.5 w-3.5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

export function AuthTextarea({
  label,
  id,
  error,
  leftIcon,
  className = "",
  ...props
}: AuthTextareaProps) {
  const hasError = Boolean(error);

  return (
    <div className="space-y-2.5">
      <label
        htmlFor={id}
        className="block text-xs font-medium uppercase tracking-wider text-white/55"
      >
        {label}
      </label>
      <div className="relative">
        {leftIcon && (
          <div className="pointer-events-none absolute left-4 top-4 text-white/50">
            {leftIcon}
          </div>
        )}
        <textarea
          id={id}
          aria-invalid={hasError}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`
            ${baseControlClasses}
            ${hasError ? errorControlClasses : "border-white/10"}
            ${leftIcon ? "pl-11" : ""}
            min-h-32 resize-y
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p
          id={`${id}-error`}
          className="flex items-center gap-1.5 text-xs font-medium text-rose-300"
        >
          <svg
            className="h-3.5 w-3.5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

export function AuthAlert({
  tone = "error",
  children,
}: {
  tone?: "error" | "success";
  children: ReactNode;
}) {
  const isSuccess = tone === "success";

  const containerClasses = isSuccess
    ? "border-emerald-400/30 bg-emerald-400/5 text-emerald-200 shadow-[0_4px_12px_-2px_rgba(16,185,129,0.08)]"
    : "border-rose-400/30 bg-rose-400/5 text-rose-200 shadow-[0_4px_12px_-2px_rgba(244,63,94,0.08)]";

  const icon = isSuccess ? (
    <svg
      className="h-4 w-4 shrink-0 text-emerald-300"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ) : (
    <svg
      className="h-4 w-4 shrink-0 text-rose-300"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border px-5 py-4 text-sm font-medium backdrop-blur-sm transition-all duration-200 ${containerClasses}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {icon}
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}
