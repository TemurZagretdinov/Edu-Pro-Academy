import { useState } from "react";
import { getStudentPortalPayments } from "../../api/studentPortal";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { useAsyncData } from "../../hooks/useAsyncData";
import type { Payment } from "../../types";

type Filter = "all" | "paid" | "partial" | "unpaid";

function money(value: string | number) {
  return `${Number(value).toLocaleString()} UZS`;
}

const STATUS_CONFIG = {
  paid:    { label: "To'langan",    badge: "bg-emerald-50 text-emerald-800", dot: "bg-emerald-500" },
  partial: { label: "Qisman",       badge: "bg-amber-50 text-amber-800",     dot: "bg-amber-400"   },
  unpaid:  { label: "To'lanmagan",  badge: "bg-red-50 text-red-800",         dot: "bg-red-500"     },
} as const;

const STAT_CONFIG = [
  { key: "total_paid",   label: "Jami to'langan", accent: "#2da862", dot: "bg-emerald-500" },
  { key: "current_debt", label: "Qarzdorlik",      accent: "#e53e3e", dot: "bg-red-500"     },
  { key: "monthly_fee",  label: "Oylik to'lov",    accent: "#f59e0b", dot: "bg-amber-400"   },
] as const;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all",     label: "Barchasi"     },
  { key: "paid",    label: "To'langan"    },
  { key: "partial", label: "Qisman"       },
  { key: "unpaid",  label: "To'lanmagan"  },
];

export default function StudentPayments() {
  const { data, loading, error } = useAsyncData(getStudentPortalPayments, []);
  const [filter, setFilter] = useState<Filter>("all");

  if (loading) return <LoadingState />;
  if (error)   return <ErrorState message={error} />;
  if (!data)   return null;

  const filtered = filter === "all" ? data.items : data.items.filter((i) => i.status === filter);

  return (
    <section className="min-h-screen bg-stone-50 p-7 space-y-5 font-sans">

      {/* Header */}
      <div>
        <h2 className="text-[1.85rem] font-semibold tracking-tight text-stone-950 leading-tight">
          To'lovlar
        </h2>
        <p className="mt-1 text-sm text-stone-400">To'lovlar tarixi va qarzdorlik holati</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2.5">
        {STAT_CONFIG.map(({ key, label, accent, dot }) => (
          <div key={key} className="relative overflow-hidden bg-white rounded-2xl border border-stone-200 p-4">
            <div className="absolute top-0 inset-x-0 h-[2.5px] rounded-t-2xl" style={{ background: accent }} />
            <div className={`w-2 h-2 rounded-full mb-2 ${dot}`} />
            <p className="text-[10px] uppercase tracking-wide text-stone-400 mb-1">{label}</p>
            <p className="font-semibold text-lg leading-tight text-stone-900 break-words">
              {money(data.summary[key])}
            </p>
          </div>
        ))}
      </div>

      {/* Table section */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <span className="font-semibold text-stone-950">Tarix</span>
          <div className="flex gap-1.5 flex-wrap">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`text-[11px] px-3 py-1 rounded-full border transition-all ${
                  filter === key
                    ? "bg-stone-950 text-white border-stone-950"
                    : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-stone-400">To'lovlar yo'q.</p>
          ) : (
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b border-stone-100">
                  {["Oy", "Miqdor", "Sana", "Holat", "Izoh"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wide text-stone-400 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row: Payment) => {
                  const cfg = STATUS_CONFIG[row.status as keyof typeof STATUS_CONFIG];
                  return (
                    <tr key={row.id} className="border-b border-stone-50 last:border-0 hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-stone-500">
                        {row.paid_for_month?.slice(0, 7) ?? "-"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-medium text-stone-900">
                        {money(row.amount)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-stone-500">
                        {row.payment_date ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${cfg?.badge ?? "bg-stone-100 text-stone-600"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg?.dot ?? "bg-stone-400"}`} />
                          {cfg?.label ?? row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs italic text-stone-400">
                        {row.note ?? "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
