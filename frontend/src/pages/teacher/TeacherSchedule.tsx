import { useMemo, useState } from "react";
import { CalendarDays, Clock3, BookOpen, Users, ClipboardCheck, NotebookPen } from "lucide-react";
import { NavLink } from "react-router-dom";

import { getMyGroups, getMyLessons } from "../../api/teacherPanel";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { useAsyncData } from "../../hooks/useAsyncData";
import type { Group, LessonTime } from "../../types";
import { formatTeacherDateTime } from "../../utils/teacherPanel";

function lessonDateKey(value: string) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function todayDate() {
  const value = new Date();
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 10);
}

export default function TeacherSchedule() {
  const lessons = useAsyncData(getMyLessons, []);
  const groups = useAsyncData(getMyGroups, []);
  const [dateFilter, setDateFilter] = useState("");

  const groupsById = useMemo(
    () => new Map((groups.data ?? []).map((group) => [group.id, group])),
    [groups.data],
  );

  const sortedLessons = useMemo(
    () => [...(lessons.data ?? [])].sort((left, right) => new Date(left.datetime).getTime() - new Date(right.datetime).getTime()),
    [lessons.data],
  );

  const todayKey = todayDate();
  const filteredLessons = dateFilter ? sortedLessons.filter((lesson) => lessonDateKey(lesson.datetime) === dateFilter) : sortedLessons;
  const todayLessons = filteredLessons.filter((lesson) => lessonDateKey(lesson.datetime) === todayKey);
  const upcomingLessons = filteredLessons.filter((lesson) => lessonDateKey(lesson.datetime) > todayKey);

  if ((lessons.loading && !lessons.data) || (groups.loading && !groups.data)) return <LoadingState />;
  if (lessons.error || groups.error) return <ErrorState message={lessons.error ?? groups.error ?? "Xatolik"} />;

  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-700 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <CalendarDays size={14} />
              O'qituvchi paneli
            </div>
            <h2 className="text-3xl font-bold">Jadval</h2>
            <p className="mt-2 max-w-2xl text-sm text-cyan-100">
              Bugungi va kelayotgan darslarni bir joyda ko'ring, kerak bo'lsa darhol guruh, davomat yoki vazifaga o'ting.
            </p>
          </div>

          <label className="space-y-2 text-sm font-medium text-white">
            <span>Sana bo'yicha filter</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-white outline-none transition placeholder:text-white/70 focus:border-white/40 focus:ring-4 focus:ring-white/15"
            />
          </label>
        </div>
      </div>

      {dateFilter && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
          <p className="font-medium text-slate-700">{dateFilter} uchun darslar ko'rsatilmoqda.</p>
          <button
            type="button"
            onClick={() => setDateFilter("")}
            className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Filterni tozalash
          </button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <LessonSection
          title="Bugungi darslar"
          subtitle="Bugun uchun rejalashtirilgan mashg'ulotlar"
          items={todayLessons}
          groupsById={groupsById}
          emptyLabel="Bugun uchun dars topilmadi."
        />
        <LessonSection
          title="Kelgusi darslar"
          subtitle="Keyingi kunlar uchun rejalashtirilgan mashg'ulotlar"
          items={upcomingLessons}
          groupsById={groupsById}
          emptyLabel={dateFilter ? "Tanlangan sanadan keyin dars topilmadi." : "Kelgusi darslar hali kiritilmagan."}
        />
      </div>
    </section>
  );
}

function LessonSection({
  title,
  subtitle,
  items,
  groupsById,
  emptyLabel,
}: {
  title: string;
  subtitle: string;
  items: LessonTime[];
  groupsById: Map<number, Group>;
  emptyLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>

      <div className="space-y-4 p-6">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
            <CalendarDays className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <p className="font-semibold text-slate-700">{emptyLabel}</p>
          </div>
        ) : (
          items.map((lesson) => {
            const group = lesson.group_id ? groupsById.get(lesson.group_id) : undefined;

            return (
              <article key={lesson.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
                        {group?.name ?? "Guruhsiz dars"}
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
                      <span className="inline-flex items-center gap-2">
                        <BookOpen size={15} className="text-slate-400" />
                        {group?.course_name ?? "Kurs ko'rsatilmagan"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {group && (
                      <NavLink
                        to={`/teacher/groups/${group.id}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        <BookOpen size={15} />
                        Guruh
                      </NavLink>
                    )}
                    {group && (
                      <NavLink
                        to={`/teacher/attendance?groupId=${group.id}&date=${lessonDateKey(lesson.datetime)}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        <ClipboardCheck size={15} />
                        Davomat
                      </NavLink>
                    )}
                    {group && (
                      <NavLink
                        to={`/teacher/homework?tab=assign&groupId=${group.id}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                      >
                        <NotebookPen size={15} />
                        Vazifa
                      </NavLink>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
