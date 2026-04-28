import {
  CheckCircle,
  XCircle,
  ClipboardList,
  TrendingUp,
  Users,
  Calendar,
  BarChart3,
} from "lucide-react";

import { getHomeworkAnalytics, getHomeworkStatuses } from "../../api/homework";
import { DataTable, type Column } from "../../components/tables/DataTable";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { useAsyncData } from "../../hooks/useAsyncData";
import type { HomeworkStatus } from "../../types";

export default function HomeworkAnalytics() {
  const analytics = useAsyncData(getHomeworkAnalytics, []);
  const statuses = useAsyncData(getHomeworkStatuses, []);

  if (analytics.loading || statuses.loading) return <LoadingState />;
  if (analytics.error) return <ErrorState message={analytics.error} />;
  if (statuses.error) return <ErrorState message={statuses.error} />;

  const total = analytics.data?.total ?? 0;
  const completed = analytics.data?.completed ?? 0;
  const completionPercent = analytics.data?.completion_percent ?? 0;
  const notCompleted = total - completed;

  const columns: Column<HomeworkStatus>[] = [
    {
      header: "Vazifa ma'lumotlari",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-sm shadow-orange-500/20">
            <ClipboardList size={18} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">
              Vazifa #{row.homework_id}
            </p>
            <p className="text-xs text-slate-500">ID: {row.homework_id}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Talaba",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-xs font-medium text-white shadow-sm ring-1 ring-white/10">
            #{row.student_id}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">
              Talaba #{row.student_id}
            </p>
            <p className="text-xs text-slate-500">ID: {row.student_id}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Holat",
      cell: (row) => (
        <div
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium shadow-sm ring-1 ${
            row.is_completed
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200/60"
              : "bg-rose-50 text-rose-700 ring-rose-200/60"
          }`}
        >
          {row.is_completed ? (
            <>
              <CheckCircle size={12} />
              <span>Bajarilgan</span>
            </>
          ) : (
            <>
              <XCircle size={12} />
              <span>Bajarilmagan</span>
            </>
          )}
        </div>
      ),
    },
    {
      header: "Izoh",
      cell: (row) =>
        row.note ? (
          <div
            className="max-w-xs truncate text-sm text-slate-600"
            title={row.note}
          >
            {row.note}
          </div>
        ) : (
          <span className="text-sm text-slate-400">вЂ”</span>
        ),
    },
    {
      header: "Sana",
      cell: (row) => (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Calendar size={14} className="text-slate-400" />
          {row.submitted_at
            ? new Date(row.submitted_at).toLocaleDateString("uz-UZ")
            : "вЂ”"}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-600 via-red-600 to-rose-700 p-8 text-white shadow-2xl shadow-orange-600/20">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-gradient-to-br from-orange-300/20 to-transparent blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-64 w-64 rounded-full bg-gradient-to-tr from-rose-300/10 to-transparent blur-3xl" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur-sm ring-1 ring-white/10">
                <TrendingUp size={22} className="text-orange-200" />
              </div>
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium uppercase tracking-wide text-orange-100 backdrop-blur-sm ring-1 ring-white/10">
                Analytics
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-3xl">
              Vazifalar analitikasi
            </h1>
            <p className="max-w-xl text-base text-orange-50/80">
              Vazifalarni bajarish umumiy statistikasi va talabalar natijalari
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-white/5 p-5 backdrop-blur-sm ring-1 ring-white/10">
              <div className="text-3xl font-semibold tabular-nums">
                {completionPercent}%
              </div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wide text-orange-100">
                Umumiy bajarilish
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Jami vazifalar"
          value={total}
          icon={<ClipboardList size={20} />}
          color="blue"
          progress={100}
        />
        <StatCard
          title="Bajarilgan"
          value={completed}
          icon={<CheckCircle size={20} />}
          color="emerald"
          progress={total ? (completed / total) * 100 : 0}
        />
        <StatCard
          title="Bajarilmagan"
          value={notCompleted}
          icon={<XCircle size={20} />}
          color="rose"
          progress={total ? (notCompleted / total) * 100 : 0}
        />
        <StatCard
          title="Bajarilish foizi"
          value={`${completionPercent}%`}
          icon={<TrendingUp size={20} />}
          color="purple"
          progress={completionPercent}
        />
      </div>

      {/* Activity Banner */}
      <div className="rounded-3xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6 shadow-xl shadow-indigo-100/30">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-indigo-100 p-3 ring-1 ring-indigo-200/60">
              <Users size={24} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
                Talabalar faolligi
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
                {completionPercent}%
              </p>
              <p className="mt-0.5 text-sm text-slate-500">
                vazifalarni bajarish ko'rsatkichi
              </p>
            </div>
          </div>
          <div className="flex-1 lg:max-w-md">
            <div className="mb-1.5 flex justify-between text-xs font-medium">
              <span className="text-slate-600">Bajarilgan</span>
              <span className="font-semibold tabular-nums text-slate-900">
                {completed} / {total}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-indigo-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 shadow-[0_0_8px_rgba(79,70,229,0.3)] transition-all duration-700"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/20">
        <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-50 p-2 ring-1 ring-orange-200/60">
              <BarChart3 size={18} className="text-orange-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Vazifalar bajarilish holati
              </h3>
              <p className="text-sm text-slate-500">
                Barcha topshiriqlar va talabalar natijalari
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <TrendingUp size={14} />
            <span>Jami {statuses.data?.length ?? 0} ta qayd</span>
          </div>
        </div>
        <DataTable
          data={statuses.data ?? []}
          columns={columns}
          emptyLabel={
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ClipboardList className="mb-4 h-14 w-14 text-slate-300" />
              <p className="text-base font-semibold text-slate-700">
                Hech qanday vazifa statusi topilmadi
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Vazifalar yaratilgandan so'ng bu yerda ko'rinadi
              </p>
            </div>
          }
          className="[&_table]:min-w-full [&_th]:px-6 [&_th]:py-3.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-slate-500 [&_td]:px-6 [&_td]:py-4 [&_td]:text-sm [&_tr]:border-b [&_tr]:border-slate-100 [&_tr:last-child]:border-0 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-slate-50/80"
        />
      </div>
    </div>
  );
}

/* Helper component: StatCard */
function StatCard({
  title,
  value,
  icon,
  color,
  progress,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: "blue" | "emerald" | "rose" | "purple";
  progress: number;
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-700 ring-blue-200/60",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
    rose: "bg-rose-50 text-rose-700 ring-rose-200/60",
    purple: "bg-purple-50 text-purple-700 ring-purple-200/60",
  };

  const progressColor = {
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
    rose: "bg-rose-500",
    purple: "bg-purple-500",
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/30">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <div
          className={`rounded-xl p-2.5 ring-1 transition-all duration-300 group-hover:scale-105 ${colorClasses[color]}`}
        >
          {icon}
        </div>
      </div>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${progressColor[color]} transition-all duration-700`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
