import { useState } from "react";
import {
  Calendar,
  Users,
  BookOpen,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  PlusCircle,
  ClipboardCheck,
} from "lucide-react";

import {
  createLesson,
  getAttendance,
  getLessons,
  markAttendance,
} from "../../api/attendance";
import { getErrorMessage } from "../../api/client";
import { getGroups } from "../../api/groups";
import { getStudents } from "../../api/students";
import { AttendanceForm } from "../../components/forms/AttendanceForm";
import { LessonForm } from "../../components/forms/LessonForm";
import { DataTable, type Column } from "../../components/tables/DataTable";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { useAsyncData } from "../../hooks/useAsyncData";
import type { Attendance, AttendancePayload } from "../../types";

export default function Attendance() {
  const attendance = useAsyncData(getAttendance, []);
  const students = useAsyncData(getStudents, []);
  const lessons = useAsyncData(getLessons, []);
  const groups = useAsyncData(getGroups, []);
  const [formError, setFormError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"attendance" | "lesson">(
    "attendance"
  );

  async function handleSubmit(payload: AttendancePayload) {
    setFormError(null);
    try {
      await markAttendance(payload);
      await attendance.reload();
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  }

  async function handleLessonSubmit(payload: Parameters<typeof createLesson>[0]) {
    setFormError(null);
    try {
      await createLesson(payload);
      await lessons.reload();
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  }

  const attendanceData = attendance.data ?? [];

  const stats = {
    total: attendanceData.length,
    came: attendanceData.filter((a) => a.status === "came").length,
    absent: attendanceData.filter((a) => a.status === "absent").length,
    late: attendanceData.filter((a) => a.status === "late").length,
    attendanceRate:
      attendanceData.length > 0
        ? Math.round(
            (attendanceData.filter((a) => a.status === "came").length /
              attendanceData.length) *
              100
          )
        : 0,
  };

  const columns: Column<Attendance>[] = [
    {
      header: "Talaba",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-xs font-medium text-white shadow-sm ring-1 ring-white/10">
            #{row.student_id}
          </div>
          <span className="text-sm font-medium text-slate-900">
            Student #{row.student_id}
          </span>
        </div>
      ),
    },
    {
      header: "Dars",
      cell: (row) => (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <BookOpen size={14} className="text-slate-400" />
          Dars #{row.lesson_id}
        </div>
      ),
    },
    {
      header: "Holat",
      cell: (row) => {
        const config = {
          came: {
            label: "Kelgan",
            classes:
              "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
            icon: CheckCircle,
          },
          absent: {
            label: "Kelmagan",
            classes: "bg-rose-50 text-rose-700 ring-rose-200/60",
            icon: AlertCircle,
          },
          late: {
            label: "Kechikkan",
            classes: "bg-amber-50 text-amber-700 ring-amber-200/60",
            icon: Clock,
          },
        };
        const { label, classes, icon: Icon } =
          config[row.status as keyof typeof config] || config.absent;
        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium shadow-sm ring-1 ${classes}`}
          >
            <Icon size={12} />
            {label}
          </span>
        );
      },
    },
    {
      header: "Sabab",
      cell: (row) =>
        row.reason ? (
          <span className="max-w-[200px] truncate text-sm text-slate-600">
            {row.reason}
          </span>
        ) : (
          <span className="text-sm text-slate-400">вЂ”</span>
        ),
    },
    {
      header: "Yaratilgan",
      cell: (row) => (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Calendar size={14} className="text-slate-400" />
          {new Date(row.created_at).toLocaleString("uz-UZ")}
        </div>
      ),
    },
  ];

  if (
    attendance.loading ||
    students.loading ||
    lessons.loading ||
    groups.loading
  )
    return <LoadingState />;
  if (attendance.error) return <ErrorState message={attendance.error} />;
  if (students.error) return <ErrorState message={students.error} />;
  if (lessons.error) return <ErrorState message={lessons.error} />;
  if (groups.error) return <ErrorState message={groups.error} />;

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-cyan-900 to-slate-900 p-8 text-white shadow-2xl shadow-cyan-900/10">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-gradient-to-br from-emerald-400/20 to-transparent blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-64 w-64 rounded-full bg-gradient-to-tr from-cyan-400/10 to-transparent blur-3xl" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur-sm ring-1 ring-white/10">
                <Calendar size={22} className="text-emerald-300" />
              </div>
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium uppercase tracking-wide text-emerald-200 backdrop-blur-sm ring-1 ring-emerald-400/20">
                Davomat paneli
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-3xl">
              Davomat
            </h1>
            <p className="max-w-xl text-base text-slate-300">
              Talabalar davomatini kuzating va darslarga qatnashuvni belgilang.
              Aniq statistik ma'lumotlar bilan guruhlar faolligini nazorat
              qiling.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-white/5 p-5 backdrop-blur-sm ring-1 ring-white/10">
              <div className="text-3xl font-semibold tabular-nums tracking-tight">
                {stats.attendanceRate}%
              </div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-300">
                Davomat darajasi
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Jami qatnashuvlar"
          value={stats.total}
          icon={<Users size={20} />}
          color="slate"
        />
        <StatCard
          title="Kelganlar"
          value={stats.came}
          icon={<CheckCircle size={20} />}
          color="emerald"
        />
        <StatCard
          title="Kelmaganlar"
          value={stats.absent}
          icon={<AlertCircle size={20} />}
          color="rose"
        />
        <StatCard
          title="Kechikkanlar"
          value={stats.late}
          icon={<Clock size={20} />}
          color="amber"
        />
      </div>

      {formError && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-5 text-rose-800 shadow-sm backdrop-blur-sm">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-500" />
          <p className="text-sm font-medium">{formError}</p>
        </div>
      )}

      <div className="border-b border-slate-200/80">
        <nav className="flex gap-1">
          <TabButton
            active={activeTab === "attendance"}
            onClick={() => setActiveTab("attendance")}
            icon={<ClipboardCheck size={16} />}
            label="Davomat belgilash"
          />
          <TabButton
            active={activeTab === "lesson"}
            onClick={() => setActiveTab("lesson")}
            icon={<PlusCircle size={16} />}
            label="Dars yaratish"
          />
        </nav>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/20">
        <div className="border-b border-slate-200/80 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white p-1.5 shadow-sm ring-1 ring-slate-200/80">
              {activeTab === "attendance" ? (
                <CheckCircle size={16} className="text-emerald-600" />
              ) : (
                <BookOpen size={16} className="text-emerald-600" />
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {activeTab === "attendance"
                  ? "Davomat belgilash"
                  : "Yangi dars yaratish"}
              </h3>
              <p className="text-sm text-slate-500">
                {activeTab === "attendance"
                  ? "Talaba va dars tanlab, davomat holatini belgilang"
                  : "Guruh uchun yangi dars vaqtini belgilang"}
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {activeTab === "attendance" ? (
            <AttendanceForm
              students={students.data ?? []}
              lessons={lessons.data ?? []}
              onSubmit={handleSubmit}
            />
          ) : (
            <LessonForm
              groups={groups.data ?? []}
              onSubmit={handleLessonSubmit}
            />
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/20">
        <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-100 p-1.5">
              <TrendingUp size={16} className="text-slate-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Qatnashuv tarixi
              </h3>
              <p className="text-sm text-slate-500">
                Barcha qayd etilgan davomatlar ro'yxati
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock size={14} />
            Oxirgi 30 kunlik ma'lumot
          </div>
        </div>
        <DataTable
          data={attendanceData}
          columns={columns}
          emptyLabel="Hali hech qanday davomat qayd etilmagan"
          className="[&_table]:min-w-full [&_th]:px-6 [&_th]:py-3.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-slate-500 [&_td]:px-6 [&_td]:py-4 [&_td]:text-sm [&_tr]:border-b [&_tr]:border-slate-100 [&_tr:last-child]:border-0 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-slate-50/80"
        />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: "slate" | "emerald" | "rose" | "amber";
}) {
  const colorClasses = {
    slate: "bg-slate-50 text-slate-700 ring-slate-200/60",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
    rose: "bg-rose-50 text-rose-700 ring-rose-200/60",
    amber: "bg-amber-50 text-amber-700 ring-amber-200/60",
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
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all ${
        active
          ? "text-emerald-700"
          : "text-slate-500 hover:text-slate-700"
      }`}
    >
      <span
        className={`transition-transform duration-200 group-hover:scale-105 ${
          active
            ? "text-emerald-600"
            : "text-slate-400 group-hover:text-slate-600"
        }`}
      >
        {icon}
      </span>
      {label}
      {active && (
        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500" />
      )}
    </button>
  );
}


