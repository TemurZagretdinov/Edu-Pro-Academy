import type { ReactNode } from "react";

type StatusBadgeProps = {
  active: boolean;
  trueLabel?: ReactNode;
  falseLabel?: ReactNode;
};

export function StatusBadge({
  active,
  trueLabel = "Active",
  falseLabel = "Inactive",
}: StatusBadgeProps) {
  const baseClasses =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 ease-out select-none";

  const activeClasses =
    "bg-emerald-50/80 text-emerald-700 border border-emerald-200/60 shadow-[0_1px_2px_-1px_rgba(16,185,129,0.1),inset_0_0_0_1px_rgba(255,255,255,0.5)] backdrop-blur-sm hover:bg-emerald-100/90 hover:shadow-[0_2px_4px_-2px_rgba(16,185,129,0.15)]";

  const inactiveClasses =
    "bg-slate-100/80 text-slate-600 border border-slate-200/60 shadow-[0_1px_2px_-1px_rgba(0,0,0,0.02),inset_0_0_0_1px_rgba(255,255,255,0.5)] backdrop-blur-sm hover:bg-slate-200/80 hover:text-slate-700";

  return (
    <span className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}>
      <span
        className={`relative flex h-2 w-2 ${
          active ? "animate-pulse" : ""
        }`}
        aria-hidden="true"
      >
        <span
          className={`absolute inline-flex h-full w-full rounded-full ${
            active
              ? "bg-emerald-500 shadow-[0_0_6px_0_rgba(16,185,129,0.6)]"
              : "bg-slate-400"
          }`}
        />
        {active && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
        )}
      </span>
      {active ? trueLabel : falseLabel}
    </span>
  );
}
