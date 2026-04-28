import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-slate-900 text-white shadow-sm hover:bg-slate-800 active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-slate-300",
  secondary:
    "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-slate-200",
  ghost:
    "border border-white/25 bg-white/10 text-white shadow-sm backdrop-blur-sm hover:bg-white/20 active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-white/20",
  danger:
    "bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-rose-200",
};

const baseClasses =
  "relative inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium leading-none transition-all duration-200 ease-out select-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none disabled:active:scale-100 focus:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${className}`}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-1.5">
        {children}
      </span>
    </button>
  );
}
