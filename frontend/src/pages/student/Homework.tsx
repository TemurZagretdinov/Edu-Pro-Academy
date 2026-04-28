import { getStudentPortalHomework } from "../../api/studentPortal";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { useAsyncData } from "../../hooks/useAsyncData";
import type { StudentHomeworkItem } from "../../types";
import { useState } from "react";

type Filter = "all" | "pending" | "done";

const CalendarIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <rect x="2" y="3" width="12" height="11" rx="2"/><line x1="5" y1="1.5" x2="5" y2="4.5"/>
    <line x1="11" y1="1.5" x2="11" y2="4.5"/><line x1="2" y1="7" x2="14" y2="7"/>
  </svg>
);

export default function StudentHomework() {
  const { data, loading, error } = useAsyncData(getStudentPortalHomework, []);
  const [filter, setFilter] = useState<Filter>("all");

  if (loading) return <LoadingState />;
  if (error)   return <ErrorState message={error} />;

  const items = data ?? [];
  const filtered =
    filter === "done"    ? items.filter((i) => i.is_completed)  :
    filter === "pending" ? items.filter((i) => !i.is_completed) :
    items;

  const counts = {
    all:     items.length,
    pending: items.filter((i) => !i.is_completed).length,
    done:    items.filter((i) => i.is_completed).length,
  };

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all",     label: "Barchasi"   },
    { key: "pending", label: "Kutilmoqda" },
    { key: "done",    label: "Bajarilgan" },
  ];

  return (
    <section className="min-h-screen bg-stone-50 p-7 space-y-5 font-sans">

      {/* Header */}
      <div>
        <h2 className="text-[1.85rem] font-semibold tracking-tight text-stone-950 leading-tight">
          Vazifalar
        </h2>
        <p className="mt-1 text-sm text-stone-400">Sizga biriktirilgan vazifalar - faqat ko'rish uchun</p>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`text-xs px-3.5 py-1.5 rounded-full border transition-all ${
              filter === key
                ? "bg-stone-950 text-white border-stone-950"
                : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
            }`}
          >
            {label}{" "}
            <span className="opacity-50 ml-0.5">{counts[key]}</span>
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 py-14 text-center text-sm text-stone-400">
          Vazifalar yo'q.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((row: StudentHomeworkItem) => (
            <div
              key={row.id}
              className={`bg-white rounded-2xl border border-stone-200 p-5 hover:bg-stone-50 transition-colors ${
                row.is_completed ? "opacity-70" : ""
              }`}
            >
              {/* Title + badge */}
              <div className="flex items-start justify-between gap-3 mb-1">
                <span className={`font-medium text-[15px] leading-snug ${
                  row.is_completed ? "line-through text-stone-400" : "text-stone-950"
                }`}>
                  {row.title}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap flex-shrink-0 ${
                  row.is_completed
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-amber-50 text-amber-800"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    row.is_completed ? "bg-emerald-500" : "bg-amber-400"
                  }`} />
                  {row.is_completed ? "Bajarilgan" : "Kutilmoqda"}
                </span>
              </div>

              {/* Description */}
              {row.description && (
                <p className="text-sm text-stone-500 leading-relaxed mb-3">{row.description}</p>
              )}

              {/* Meta */}
              {row.due_date && (
                <div className="flex items-center gap-1.5 text-stone-400 text-xs mb-2">
                  <CalendarIcon />
                  <span className="font-mono text-[11px] text-stone-500">{row.due_date}</span>
                </div>
              )}

              {/* Note */}
              {row.note && (
                <div className="mt-2 pl-3 border-l-2 border-stone-200 text-xs text-stone-500 leading-relaxed">
                  {row.note}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
