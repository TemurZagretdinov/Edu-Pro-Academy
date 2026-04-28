import { useState, useMemo } from "react";
import { getStudentPortalSchedule } from "../../api/studentPortal";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { useAsyncData } from "../../hooks/useAsyncData";
import type { StudentScheduleItem } from "../../types";

const DAY_ORDER = ["Dushanba","Seshanba","Chorshanba","Payshanba","Juma","Shanba","Yakshanba"];
const JS_DAY_MAP: Record<number, string> = { 1:"Dushanba",2:"Seshanba",3:"Chorshanba",4:"Payshanba",5:"Juma",6:"Shanba",0:"Yakshanba" };
const TODAY = JS_DAY_MAP[new Date().getDay()];

function timeRange(item: StudentScheduleItem) {
  return { start: item.start_time.slice(0, 5), end: item.end_time.slice(0, 5) };
}

export default function StudentSchedule() {
  const { data, loading, error } = useAsyncData(getStudentPortalSchedule, []);

  const items = data?.items ?? [];
  const daysWithItems = useMemo(
    () => DAY_ORDER.filter((d) => items.some((i) => i.day_of_week === d)),
    [items]
  );
  const defaultDay = daysWithItems.includes(TODAY) ? TODAY : (daysWithItems[0] ?? "all");
  const [active, setActive] = useState<string>(defaultDay);

  if (loading) return <LoadingState />;
  if (error)   return <ErrorState message={error} />;

  const filtered = active === "all" ? items : items.filter((i) => i.day_of_week === active);
  const groupedAll = daysWithItems.map((day) => ({
    day,
    rows: items.filter((i) => i.day_of_week === day),
  }));

  return (
    <section className="min-h-screen bg-stone-50 p-7 font-sans space-y-5">
      <div>
        <h2 className="text-[1.85rem] font-semibold tracking-tight text-stone-950 leading-tight">
          Dars jadvali
        </h2>
        <p className="mt-1 text-sm text-stone-400">Guruhingiz uchun haftalik dars jadvali</p>
      </div>

      {/* Day tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {[{ key: "all", label: "Hammasi", isToday: false }, ...daysWithItems.map((d) => ({ key: d, label: d, isToday: d === TODAY }))].map(({ key, label, isToday }) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={`relative text-xs px-3.5 py-1.5 rounded-full border transition-all ${
              active === key
                ? isToday ? "bg-emerald-600 text-white border-emerald-600" : "bg-stone-950 text-white border-stone-950"
                : isToday ? "bg-white text-emerald-700 border-emerald-300 hover:border-emerald-400" : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
            }`}
          >
            {label}
            {isToday && active !== key && (
              <span className="absolute top-1 right-1.5 w-1 h-1 rounded-full bg-emerald-500" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 py-14 text-center text-sm text-stone-400">
          Dars jadvali hali kiritilmagan.
        </div>
      ) : active === "all" ? (
        <div className="space-y-5">
          {groupedAll.map(({ day, rows }) => (
            <div key={day}>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400 mb-2.5 pl-1">
                {day}{day === TODAY && <span className="ml-2 text-emerald-500 font-normal normal-case tracking-normal">- bugun</span>}
              </p>
              <ScheduleCards rows={rows} />
            </div>
          ))}
        </div>
      ) : (
        <ScheduleCards rows={filtered} />
      )}
    </section>
  );
}

function ScheduleCards({ rows }: { rows: StudentScheduleItem[] }) {
  if (!rows.length) return (
    <div className="bg-white rounded-2xl border border-stone-200 py-10 text-center text-sm text-stone-400">
      Bu kun dars yo'q.
    </div>
  );
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, i) => {
        const { start, end } = timeRange(row);
        return (
          <div key={i} className="bg-white rounded-2xl border border-stone-200 px-5 py-4 grid grid-cols-[52px_1fr_auto] items-center gap-3 hover:bg-stone-50 transition-colors">
            {/* Time */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="font-mono text-sm font-medium text-stone-900">{start}</span>
              <span className="w-px h-2.5 bg-stone-200" />
              <span className="font-mono text-[11px] text-stone-400">{end}</span>
            </div>
            {/* Subject + teacher */}
            <div className="min-w-0">
              <p className="font-medium text-sm text-stone-900 truncate">{row.subject_name}</p>
              <p className="text-xs text-stone-400 truncate mt-0.5">{row.teacher_name ?? "-"}</p>
            </div>
            {/* Room + order */}
            <div className="flex flex-col items-end gap-1">
              {row.room
                ? <span className="font-mono text-[11px] bg-emerald-50 text-emerald-700 rounded-md px-2 py-0.5">{row.room}</span>
                : <span className="text-stone-300 text-xs">-</span>}
              <span className="font-mono text-[10px] text-stone-300">{String(i + 1).padStart(2, "0")}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
