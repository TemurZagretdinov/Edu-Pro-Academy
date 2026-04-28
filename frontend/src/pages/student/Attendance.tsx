import { getStudentPortalAttendance } from "../../api/studentPortal";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { useAsyncData } from "../../hooks/useAsyncData";

const STATUS_CONFIG = {
  present: { label: "Keldi", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-800", bar: "bg-emerald-500" },
  came: { label: "Keldi", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-800", bar: "bg-emerald-500" },
  late: { label: "Kechikdi", dot: "bg-amber-400", badge: "bg-amber-50 text-amber-800", bar: "bg-amber-400" },
  absent: { label: "Kelmadi", dot: "bg-red-500", badge: "bg-red-50 text-red-800", bar: "bg-red-500" },
  excused: { label: "Sababli", dot: "bg-stone-400", badge: "bg-stone-100 text-stone-700", bar: "bg-stone-400" },
} as const;

export default function StudentAttendance() {
  const { data, loading, error } = useAsyncData(getStudentPortalAttendance, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const { present, late, absent } = data.summary;
  const total = present + late + absent;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  const stats = [
    { key: "present" as const, label: "Keldi", value: present },
    { key: "late" as const, label: "Kechikdi", value: late },
    { key: "absent" as const, label: "Kelmadi", value: absent },
  ];

  return (
    <section className="min-h-screen space-y-6 bg-stone-50 p-6 font-sans">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-stone-950">Davomat tarixi</h2>
        <p className="mt-1 text-sm text-stone-400">Darslarga qatnashish holatingiz</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ key, label, value }) => {
          const cfg = STATUS_CONFIG[key];
          return (
            <div key={key} className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-5">
              <div className={`absolute inset-x-0 top-0 h-0.5 ${cfg.bar}`} />
              <div className={`mb-3 h-2 w-2 rounded-full ${cfg.dot}`} />
              <p className="text-3xl font-semibold tracking-tight text-stone-900">{value}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-stone-400">{label}</p>
              <span className={`mt-3 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.badge}`}>
                {pct(value)}%
              </span>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <p className="mb-3 text-[11px] uppercase tracking-wide text-stone-400">Umumiy ko'rsatkich</p>
        <div className="flex h-2 overflow-hidden rounded-full bg-stone-100">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct(present)}%` }} />
          <div className="h-full bg-amber-400 transition-all" style={{ width: `${pct(late)}%` }} />
          <div className="h-full bg-red-500 transition-all" style={{ width: `${pct(absent)}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-4">
          {stats.map(({ key, label, value }) => (
            <div key={key} className="flex items-center gap-1.5 text-xs text-stone-600">
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[key].dot}`} />
              {label} - {pct(value)}%
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <span className="text-sm font-medium text-stone-600">Barcha yozuvlar</span>
          <span className="text-xs text-stone-400">{data.items.length} ta</span>
        </div>
        {data.items.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-stone-400">Davomat yozuvlari yo'q.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-100">
                {["Sana", "Holat", "Izoh"].map((header) => (
                  <th
                    key={header}
                    className="px-5 py-3 text-left text-[11px] font-normal uppercase tracking-wide text-stone-400"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((row, index) => {
                const cfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.present;
                const date = row.date ?? new Date(row.created_at).toLocaleDateString();
                const note = row.note ?? row.reason;

                return (
                  <tr key={index} className="border-b border-stone-50 transition-colors last:border-0 hover:bg-stone-50">
                    <td className="px-5 py-3.5 text-sm tabular-nums text-stone-400">{date}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm italic text-stone-400">{note ?? "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

