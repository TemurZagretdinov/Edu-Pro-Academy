import type { ReactNode } from "react";

type StatCardProps = {
  title: string;
  value: ReactNode;
  note?: string;
};

export function StatCard({ title, value, note }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04),0_4px_12px_-2px_rgba(0,0,0,0.02)] backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-slate-300/80 hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(15,23,42,0.02)]">
      {/* Subtle gradient accent */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400/30 via-cyan-500/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <div className="mt-2 text-3xl font-semibold leading-tight tracking-tight tabular-nums text-slate-900">
        {value}
      </div>

      {note && (
        <p className="mt-3 text-sm font-normal text-slate-500">
          {note}
        </p>
      )}
    </div>
  );
}

