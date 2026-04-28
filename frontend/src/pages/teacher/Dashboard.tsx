import { useMemo, type ReactNode } from "react";
import {
  Activity,
  BookOpen,
  CalendarCheck2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Clock3,
  PhoneOff,
  TriangleAlert,
  Users,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { getTeacherDashboardStats } from "../../api/dashboard";
import { getMyAttendance, getMyGroups, getMyHomeworkStatuses, getMyLessons, getMyStudents } from "../../api/teacherPanel";
import { TeacherRiskBadge } from "../../components/teacher/TeacherRiskBadge";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { useAsyncData } from "../../hooks/useAsyncData";
import type { Group, Student } from "../../types";
import {
  buildTeacherStudentInsights,
  formatTeacherDateTime,
  groupNameFromMap,
  resolveTeacherRisk,
  teacherStudentName,
} from "../../utils/teacherPanel";

function todayDate() {
  const value = new Date();
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 10);
}

export default function TeacherDashboard() {
  const stats = useAsyncData(getTeacherDashboardStats, []);
  const groups = useAsyncData(getMyGroups, []);
  const lessons = useAsyncData(() => getMyLessons({ lesson_date: todayDate() }), []);
  const students = useAsyncData(() => getMyStudents({ include_inactive: true }), []);
  const attendance = useAsyncData(() => getMyAttendance({ limit: 500 }), []);
  const homeworkStatuses = useAsyncData(getMyHomeworkStatuses, []);

  const groupsById = useMemo(
    () => new Map((groups.data ?? []).map((group) => [group.id, group])),
    [groups.data],
  );

  const todayLessons = useMemo(
    () => [...(lessons.data ?? [])].sort((left, right) => new Date(left.datetime).getTime() - new Date(right.datetime).getTime()),
    [lessons.data],
  );

  const attentionInsights = useMemo(
    () => buildTeacherStudentInsights(students.data ?? [], attendance.data ?? [], homeworkStatuses.data ?? []),
    [attendance.data, homeworkStatuses.data, students.data],
  );

  const poorAttendanceStudents = useMemo(
    () =>
      (students.data ?? [])
        .filter((student) => {
          const insight = attentionInsights.get(student.id);
          return Boolean(insight && insight.attendancePercent !== null && insight.attendancePercent < 70);
        })
        .sort(
          (left, right) =>
            (attentionInsights.get(left.id)?.attendancePercent ?? 100) - (attentionInsights.get(right.id)?.attendancePercent ?? 100),
        )
        .slice(0, 4),
    [attentionInsights, students.data],
  );

  const missingParentStudents = useMemo(
    () => (students.data ?? []).filter((student) => !student.parent_phone_number).slice(0, 4),
    [students.data],
  );

  const homeworkIssueStudents = useMemo(
    () =>
      (students.data ?? [])
        .filter((student) => {
          const insight = attentionInsights.get(student.id);
          return Boolean(insight && insight.homeworkPercent !== null && insight.homeworkPercent < 60);
        })
        .sort(
          (left, right) =>
            (attentionInsights.get(left.id)?.homeworkPercent ?? 100) - (attentionInsights.get(right.id)?.homeworkPercent ?? 100),
        )
        .slice(0, 4),
    [attentionInsights, students.data],
  );

  const attentionError = students.error ?? attendance.error ?? homeworkStatuses.error;
  const attentionReady = !students.loading && !attendance.loading && !homeworkStatuses.loading;

  if (stats.loading || groups.loading || lessons.loading) return <LoadingState />;
  if (stats.error || groups.error || lessons.error) return <ErrorState message={stats.error ?? groups.error ?? lessons.error ?? "Xatolik"} />;
  if (!stats.data) return null;

  const quickActions = [
    { to: "/teacher/attendance", label: "Davomat belgilash", icon: CalendarCheck2, accent: "from-emerald-500 to-cyan-600" },
    { to: "/teacher/homework?tab=assign", label: "Vazifa qo'shish", icon: ClipboardList, accent: "from-amber-500 to-orange-600" },
    { to: "/teacher/students", label: "Talabalar", icon: Users, accent: "from-sky-500 to-indigo-600" },
    { to: "/teacher/groups", label: "Guruhlar", icon: BookOpen, accent: "from-violet-500 to-fuchsia-600" },
  ];

  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white shadow-lg">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.95fr]">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <CalendarDays size={14} />
              O'qituvchi paneli
            </div>
            <h2 className="text-3xl font-bold">Bugungi ishlar</h2>
            <p className="mt-2 max-w-2xl text-sm text-blue-100">
              Asosiy harakatlar, bugungi darslar va e'tibor talab qiladigan talabalar shu yerda jamlangan.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {quickActions.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`rounded-2xl bg-gradient-to-r ${item.accent} p-4 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white/90">{item.label}</p>
                      <p className="mt-1 text-xs text-white/75">Tezkor o'tish</p>
                    </div>
                    <Icon size={18} className="text-white" />
                  </div>
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard label="Mening guruhlarim" value={stats.data.own_groups} tone="blue" />
        <StatsCard label="Jami talabalar" value={stats.data.total_students} tone="emerald" />
        <StatsCard label="Bugungi darslar" value={stats.data.todays_lessons} tone="amber" />
        <StatsCard label="Vazifa bajarilishi" value={`${stats.data.homework_completion_percent}%`} tone="violet" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Bugungi darslar</h3>
                <p className="text-sm text-slate-500">Har bir darsdan guruh, davomat va vazifaga o'ting</p>
              </div>
              <NavLink to="/teacher/schedule" className="text-sm font-semibold text-sky-600 transition hover:text-sky-700">
                Jadvalni ochish
              </NavLink>
            </div>
          </div>

          <div className="space-y-4 p-6">
            {todayLessons.length === 0 ? (
              <EmptyBlock
                icon={CalendarDays}
                title="Bugun uchun dars topilmadi"
                description="Jadval sahifasida kelgusi darslarni ko'rishingiz mumkin."
              />
            ) : (
              todayLessons.map((lesson) => {
                const group = lesson.group_id ? groupsById.get(lesson.group_id) : undefined;

                return (
                  <article key={lesson.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
                            {group?.name ?? "Guruhsiz"}
                          </p>
                          <h4 className="mt-1 text-lg font-bold text-slate-900">{lesson.title || "Mavzu kiritilmagan"}</h4>
                        </div>

                        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                          <span className="inline-flex items-center gap-2">
                            <Clock3 size={15} className="text-slate-400" />
                            {formatTeacherDateTime(lesson.datetime)}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <Users size={15} className="text-slate-400" />
                            {group?.students_count ?? "-"} ta talaba
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {group && (
                          <QuickLink
                            to={`/teacher/groups/${group.id}`}
                            label="Guruh"
                            icon={BookOpen}
                            className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                          />
                        )}
                        {group && (
                          <QuickLink
                            to={`/teacher/attendance?groupId=${group.id}&date=${todayDate()}`}
                            label="Davomat"
                            icon={CalendarCheck2}
                            className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          />
                        )}
                        {group && (
                          <QuickLink
                            to={`/teacher/homework?tab=assign&groupId=${group.id}`}
                            label="Vazifa"
                            icon={ClipboardList}
                            className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                          />
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Bugungi holat</h3>
              <p className="text-sm text-slate-500">Davomat va so'nggi faoliyat</p>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {(stats.data.today_attendance_summary.length > 0 ? stats.data.today_attendance_summary : [
                  { status: "empty", count: 0 },
                ]).map((item) => (
                  <div key={item.status} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-medium text-slate-500">{attendanceLabel(item.status)}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{item.count}</p>
                  </div>
                ))}
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Activity size={16} className="text-slate-400" />
                  <p className="text-sm font-semibold text-slate-700">So'nggi faollik</p>
                </div>

                {stats.data.recent_activity.length === 0 ? (
                  <p className="text-sm text-slate-500">Hozircha faollik qayd etilmagan.</p>
                ) : (
                  <div className="space-y-2">
                    {stats.data.recent_activity.map((item, index) => (
                      <div key={index} className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        {item}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <TriangleAlert size={18} className="text-amber-500" />
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Diqqat talab qilinadi</h3>
              <p className="text-sm text-slate-500">Davomat, ota-ona kontakti va vazifa bo'yicha tezkor ko'rinish</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6 xl:grid-cols-3">
          {attentionError ? (
            <div className="xl:col-span-3">
              <EmptyBlock
                icon={TriangleAlert}
                title="Tahlilni yuklab bo'lmadi"
                description={attentionError}
              />
            </div>
          ) : !attentionReady ? (
            <div className="xl:col-span-3">
              <LoadingState />
            </div>
          ) : (
            <>
              <AttentionColumn
                title="Davomati past"
                icon={CalendarCheck2}
                emptyLabel="Davomati xavfli darajaga tushgan talaba topilmadi."
                items={poorAttendanceStudents}
                renderItem={(student) => {
                  const insight = attentionInsights.get(student.id);
                  return (
                    <AttentionStudentCard
                      key={student.id}
                      student={student}
                      subtitle={`${insight?.attendancePercent ?? 0}% davomat`}
                      groupsById={groupsById}
                      riskLevel={resolveTeacherRisk(insight?.attendancePercent ?? null, insight?.homeworkPercent ?? null)}
                    />
                  );
                }}
              />
              <AttentionColumn
                title="Ota-ona kontakti yo'q"
                icon={PhoneOff}
                emptyLabel="Barcha talabalarda ota-ona raqami mavjud."
                items={missingParentStudents}
                renderItem={(student) => (
                  <AttentionStudentCard
                    key={student.id}
                    student={student}
                    subtitle="Ota-ona raqami kiritilmagan"
                    groupsById={groupsById}
                    riskLevel={attentionInsights.get(student.id)?.riskLevel ?? "medium"}
                  />
                )}
              />
              <AttentionColumn
                title="Vazifa muammolari"
                icon={ClipboardList}
                emptyLabel="Vazifa bajarilishi bo'yicha xavfli holat topilmadi."
                items={homeworkIssueStudents}
                renderItem={(student) => {
                  const insight = attentionInsights.get(student.id);
                  return (
                    <AttentionStudentCard
                      key={student.id}
                      student={student}
                      subtitle={`${insight?.homeworkPercent ?? 0}% vazifa`}
                      groupsById={groupsById}
                      riskLevel={resolveTeacherRisk(insight?.attendancePercent ?? null, insight?.homeworkPercent ?? null)}
                    />
                  );
                }}
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function StatsCard({ label, value, tone }: { label: string; value: number | string; tone: "blue" | "emerald" | "amber" | "violet" }) {
  const palette = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
  };

  return (
    <div className={`rounded-2xl border px-5 py-4 ${palette[tone]}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function QuickLink({
  to,
  label,
  icon: Icon,
  className,
}: {
  to: string;
  label: string;
  icon: typeof BookOpen;
  className: string;
}) {
  return (
    <NavLink to={to} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${className}`}>
      <Icon size={15} />
      {label}
    </NavLink>
  );
}

function EmptyBlock({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof CalendarDays;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
      <Icon className="mx-auto mb-3 h-12 w-12 text-slate-300" />
      <p className="font-semibold text-slate-700">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function AttentionColumn<T>({
  title,
  icon: Icon,
  items,
  emptyLabel,
  renderItem,
}: {
  title: string;
  icon: typeof CalendarCheck2;
  items: T[];
  emptyLabel: string;
  renderItem: (item: T) => ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-slate-400" />
        <h4 className="font-semibold text-slate-900">{title}</h4>
      </div>

      {items.length === 0 ? <p className="text-sm text-slate-500">{emptyLabel}</p> : <div className="space-y-3">{items.map(renderItem)}</div>}
    </div>
  );
}

function AttentionStudentCard({
  student,
  subtitle,
  groupsById,
  riskLevel,
}: {
  student: Student;
  subtitle: string;
  groupsById: Map<number, Group>;
  riskLevel: ReturnType<typeof resolveTeacherRisk>;
}) {
  return (
    <NavLink to={`/teacher/students/${student.id}`} className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">{teacherStudentName(student)}</p>
          <p className="mt-1 text-sm text-slate-500">{groupNameFromMap(student.group_id, groupsById)}</p>
          <p className="mt-2 text-sm font-medium text-slate-700">{subtitle}</p>
        </div>
        <TeacherRiskBadge level={riskLevel} />
      </div>
      <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-sky-600">
        Progress
        <ChevronRight size={15} />
      </div>
    </NavLink>
  );
}

function attendanceLabel(status: string) {
  if (status === "present" || status === "came") return "Kelganlar";
  if (status === "late") return "Kechikkanlar";
  if (status === "absent") return "Kelmaganlar";
  return "Davomat";
}

