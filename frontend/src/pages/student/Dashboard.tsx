import { Calendar as CalendarIcon, Check as CheckIcon, CreditCard as CreditCardIcon, Users as UsersIcon } from "lucide-react";

import { getStudentDashboard } from "../../api/studentPortal";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { useAsyncData } from "../../hooks/useAsyncData";
import type { StudentScheduleItem } from "../../types";

function money(value: string | number) {
  return `${(Number(value) / 1000).toFixed(0)} ming UZS`;
}

const METRIC_ACCENTS = {
  group: "#1D9E75",
  teacher: "#534AB7",
  present: "#2da862",
  late: "#f59e0b",
  debt: "#e53e3e",
};

export default function StudentDashboard() {
  const { data, loading, error } = useAsyncData(getStudentDashboard, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const { present, late, absent } = data.attendance_summary;
  const total = present + late + absent;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  const metrics = [
    { label: "Guruh", value: data.group_name ?? "Guruhsiz", note: "O'quv guruhi", accent: METRIC_ACCENTS.group },
    {
      label: "O'qituvchi",
      value: data.teacher_name?.split(" ")[0] ?? "-",
      note: data.teacher_name?.split(" ").slice(1).join(" ") ?? "",
      accent: METRIC_ACCENTS.teacher,
    },
    { label: "Keldi", value: present, note: `${pct(present)}% qatnashish`, accent: METRIC_ACCENTS.present },
    { label: "Kechikdi", value: late, note: `${pct(late)}% kechikish`, accent: METRIC_ACCENTS.late },
    {
      label: "Qarzdorlik",
      value: money(data.payment_summary.current_debt),
      note: `Oylik: ${money(data.payment_summary.monthly_fee)}`,
      accent: METRIC_ACCENTS.debt,
    },
  ];

  return (
    <section className="min-h-screen space-y-6 bg-stone-50 p-7 font-sans">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[1.85rem] leading-tight tracking-tight text-stone-950">
            Xush kelibsiz, <span className="font-semibold">{data.student_name.split(" ")[0]}</span>
          </h2>
          <p className="mt-1 text-sm text-stone-400">O'quv jarayoningiz bo'yicha qisqa ma'lumotlar</p>
        </div>
        <span className="whitespace-nowrap rounded-full bg-stone-200 px-3 py-1 font-mono text-[11px] text-stone-400">
          {new Date().toLocaleDateString("uz-UZ", { weekday: "short", day: "numeric", month: "short" })}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-5">
        {metrics.map(({ label, value, note, accent }) => (
          <div key={label} className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-4">
            <div className="absolute inset-x-0 top-0 h-[2.5px] rounded-t-2xl" style={{ background: accent }} />
            <p className="mb-2 text-[10px] uppercase tracking-wide text-stone-400">{label}</p>
            <p className="break-words text-xl font-semibold leading-tight text-stone-900">{value}</p>
            <p className="mt-1 text-[11px] leading-tight text-stone-300">{note}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50">
            <CheckIcon className="h-4 w-4 text-emerald-700" />
          </div>
          <h3 className="mb-3 text-sm font-medium text-stone-900">Davomat</h3>
          <div className="space-y-2">
            {[
              { label: "Keldi", val: present, cls: "bg-emerald-50 text-emerald-800", dot: "bg-emerald-500" },
              { label: "Kechikdi", val: late, cls: "bg-amber-50 text-amber-800", dot: "bg-amber-400" },
              { label: "Kelmadi", val: absent, cls: "bg-red-50 text-red-800", dot: "bg-red-500" },
            ].map(({ label, val, cls, dot }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-stone-400">{label}</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                  {val}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-stone-100">
            <div className="h-full bg-emerald-500" style={{ width: `${pct(present)}%` }} />
            <div className="h-full bg-amber-400" style={{ width: `${pct(late)}%` }} />
            <div className="h-full bg-red-500" style={{ width: `${pct(absent)}%` }} />
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50">
            <CreditCardIcon className="h-4 w-4 text-amber-700" />
          </div>
          <h3 className="mb-1 text-sm font-medium text-stone-900">To'lovlar</h3>
          <p className="mt-2 text-2xl font-semibold leading-tight text-stone-900">{money(data.payment_summary.current_debt)}</p>
          <p className="mb-3 mt-0.5 text-[11px] text-stone-400">joriy qarzdorlik</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-stone-400">Jami to'landi</span>
              <span className="text-xs font-medium text-emerald-700">{money(data.payment_summary.total_paid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-stone-400">Oxirgi to'lov</span>
              <span className="text-xs font-medium">{data.payment_summary.last_payment_date ?? "-"}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50">
            <UsersIcon className="h-4 w-4 text-violet-700" />
          </div>
          <h3 className="mb-3 text-sm font-medium text-stone-900">Guruh</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-stone-400">Guruh nomi</span>
              <span className="text-xs font-medium">{data.group_name ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-stone-400">O'qituvchi</span>
              <span className="text-xs font-medium">{data.teacher_name ?? "-"}</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-emerald-600" />
          <h3 className="font-semibold text-stone-950">Yaqin darslar</h3>
        </div>
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {data.next_lessons.length === 0 ? (
            <p className="py-10 text-center text-sm text-stone-400">Dars jadvali hali kiritilmagan.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-100">
                  {["Kun", "Fan", "Vaqt", "Xona"].map((header) => (
                    <th
                      key={header}
                      className="px-4 py-2.5 text-left text-[10px] font-normal uppercase tracking-wide text-stone-400"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.next_lessons.map((row: StudentScheduleItem, index: number) => (
                  <tr key={index} className="border-b border-stone-50 transition-colors last:border-0 hover:bg-stone-50">
                    <td className="px-4 py-3 font-mono text-xs text-stone-400">{row.day_of_week}</td>
                    <td className="px-4 py-3 text-sm font-medium text-stone-900">{row.subject_name}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] text-stone-600">
                        {row.start_time.slice(0, 5)}-{row.end_time.slice(0, 5)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.room ? (
                        <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-700">{row.room}</span>
                      ) : (
                        <span className="text-stone-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}

