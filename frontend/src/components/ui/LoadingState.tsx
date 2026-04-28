export function LoadingState({ label = "Loading data..." }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03),0_4px_12px_-2px_rgba(0,0,0,0.02)] backdrop-blur-sm"
    >
      <div className="relative flex h-6 w-6 items-center justify-center">
        <div className="absolute h-full w-full animate-spin rounded-full border-2 border-transparent border-t-slate-400/60 border-r-slate-400/30" />
        <div className="absolute h-3.5 w-3.5 animate-pulse rounded-full bg-gradient-to-br from-slate-300/60 to-slate-400/30" />
      </div>
      <span className="text-sm font-medium tracking-tight text-slate-500">
        {label}
      </span>
    </div>
  );
}