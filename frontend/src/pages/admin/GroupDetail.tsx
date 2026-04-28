import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  GraduationCap,
  Info,
  Plus,
  Save,
  User,
  Users,
  X,
  AlertCircle,
  MoreVertical,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { NavLink, useParams } from "react-router-dom";

import {
  createLesson,
  createLessonMonth,
  getLessonJournal,
  getLessonMonths,
  getLessons,
  saveLessonJournalBatch,
} from "../../api/attendance";
import { getErrorMessage } from "../../api/client";
import { getGroup } from "../../api/groups";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { useAsyncData } from "../../hooks/useAsyncData";
import type {
  AttendanceStatus,
  Group,
  LessonJournalRow,
  LessonTime,
  TimeMonth,
} from "../../types";

type DraftRow = {
  student: LessonJournalRow["student"];
  status: AttendanceStatus;
  grade: string;
  note: string;
  originalStatus: AttendanceStatus | null;
  originalGrade: number | null;
  originalNote: string;
  dirty: boolean;
  saved: boolean;
};

const monthFormatter = new Intl.DateTimeFormat("uz-UZ", {
  month: "long",
  year: "numeric",
});
const dateFormatter = new Intl.DateTimeFormat("uz-UZ");

function monthLabel(month: TimeMonth) {
  const value = monthFormatter.format(new Date(month.datetime));
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function lessonDate(lesson: LessonTime) {
  return new Date(lesson.datetime).toISOString().slice(0, 10);
}

function groupMeta(group: Group) {
  const parts = [];
  if (group.course_name) parts.push(group.course_name);
  if (group.lesson_days) parts.push(group.lesson_days);
  if (group.lesson_time) parts.push(group.lesson_time);
  return parts;
}

function studentName(row: DraftRow | LessonJournalRow) {
  const student = "student" in row ? row.student : row;
  return `${student.firstname} ${student.lastname}`.trim();
}

function initials(row: DraftRow) {
  return `${row.student.firstname.charAt(0)}${row.student.lastname.charAt(
    0
  )}`.toUpperCase();
}

function defaultLessonDate(month: TimeMonth) {
  const monthDate = new Date(month.datetime);
  const today = new Date();
  const sameMonth =
    monthDate.getFullYear() === today.getFullYear() &&
    monthDate.getMonth() === today.getMonth();
  const source = sameMonth ? today : monthDate;
  return source.toISOString().slice(0, 10);
}

function isGradeValid(value: string) {
  if (value.trim() === "") return true;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 100;
}

export default function GroupDetail() {
  const { id } = useParams();
  const groupId = Number(id);
  const [selectedMonthId, setSelectedMonthId] = useState<number | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [monthDrawerOpen, setMonthDrawerOpen] = useState(false);
  const [newMonth, setNewMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);

  const group = useAsyncData(() => getGroup(groupId), [groupId]);
  const months = useAsyncData(
    () => getLessonMonths({ group_id: groupId, limit: 500 }),
    [groupId]
  );
  const allLessons = useAsyncData(
    () => getLessons({ group_id: groupId, limit: 500 }),
    [groupId]
  );
  const monthLessons = useAsyncData(
    () =>
      selectedMonthId
        ? getLessons({ group_id: groupId, time_id: selectedMonthId, limit: 500 })
        : Promise.resolve([]),
    [groupId, selectedMonthId]
  );
  const journal = useAsyncData(
    () => (selectedLessonId ? getLessonJournal(selectedLessonId) : Promise.resolve([])),
    [selectedLessonId]
  );

  const monthsData = months.data ?? [];
  const lessonsData = monthLessons.data ?? [];
  const allLessonsData = allLessons.data ?? [];
  const currentGroup = group.data;
  const selectedMonth =
    monthsData.find((month) => month.id === selectedMonthId) ?? null;
  const selectedLesson =
    lessonsData.find((lesson) => lesson.id === selectedLessonId) ?? null;

  const lessonsByMonth = useMemo(() => {
    const map = new Map<number, number>();
    for (const lesson of allLessonsData) {
      if (!lesson.time_id) continue;
      map.set(lesson.time_id, (map.get(lesson.time_id) ?? 0) + 1);
    }
    return map;
  }, [allLessonsData]);

  const selectedLessonNumber = selectedLesson
    ? lessonsData.findIndex((lesson) => lesson.id === selectedLesson.id) + 1
    : 0;
  const pendingRows = draftRows.filter((row) => row.dirty);
  const hasInvalidGrades = draftRows.some((row) => !isGradeValid(row.grade));

  useEffect(() => {
    if (monthsData.length === 0) {
      setSelectedMonthId(null);
      return;
    }
    if (
      !selectedMonthId ||
      !monthsData.some((month) => month.id === selectedMonthId)
    ) {
      setSelectedMonthId(monthsData[0].id);
    }
  }, [monthsData, selectedMonthId]);

  useEffect(() => {
    if (lessonsData.length === 0) {
      setSelectedLessonId(null);
      return;
    }
    if (
      !selectedLessonId ||
      !lessonsData.some((lesson) => lesson.id === selectedLessonId)
    ) {
      setSelectedLessonId(lessonsData[0].id);
    }
  }, [lessonsData, selectedLessonId]);

  useEffect(() => {
    if (!selectedLessonId) {
      setDraftRows([]);
      return;
    }
    const rows = journal.data ?? [];
    setDraftRows(
      rows.map((row) => {
        const status = row.status ?? "present";
        const grade = row.grade == null ? "" : String(row.grade);
        const note = row.note ?? "";
        return {
          student: row.student,
          status,
          grade,
          note,
          originalStatus: row.status,
          originalGrade: row.grade,
          originalNote: note,
          dirty: !row.saved,
          saved: row.saved,
        };
      })
    );
  }, [journal.data, selectedLessonId]);

  async function reloadJournalData() {
    await Promise.all([
      months.reload(),
      monthLessons.reload(),
      allLessons.reload(),
      journal.reload(),
      group.reload(),
    ]);
  }

  async function handleCreateMonth(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);
    if (!newMonth) {
      setFormError("Oy tanlang.");
      return;
    }

    setSaving(true);
    try {
      const created = await createLessonMonth({
        group_id: groupId,
        datetime: `${newMonth}-01T00:00:00.000Z`,
        price: currentGroup?.monthly_fee ?? "0",
      });
      setSelectedMonthId(created.id);
      setSelectedLessonId(null);
      setMonthDrawerOpen(false);
      setSuccess("Yangi oy qo'shildi.");
      await Promise.all([months.reload(), allLessons.reload()]);
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateLesson() {
    if (!selectedMonth) return;
    setFormError(null);
    setSuccess(null);

    const date = defaultLessonDate(selectedMonth);
    setSaving(true);
    try {
      const lesson = await createLesson({
        title: "Mavzu kiritilmagan",
        time_id: selectedMonth.id,
        group_id: groupId,
        datetime: `${date}T09:00:00.000Z`,
        is_accepted: false,
      });
      setSelectedLessonId(lesson.id);
      setSuccess("Yangi dars qo'shildi.");
      await Promise.all([
        monthLessons.reload(),
        allLessons.reload(),
        journal.reload(),
      ]);
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function updateDraft(
    studentId: number,
    patch: Partial<Pick<DraftRow, "status" | "grade" | "note">>
  ) {
    setDraftRows((current) =>
      current.map((row) => {
        if (row.student.id !== studentId) return row;
        const next = { ...row, ...patch };
        const nextGrade = next.grade.trim() === "" ? null : Number(next.grade);
        const dirty =
          next.status !== row.originalStatus ||
          nextGrade !== row.originalGrade ||
          next.note !== row.originalNote ||
          !row.saved;
        return { ...next, dirty };
      })
    );
  }

  function resetDraft(studentId: number) {
    setDraftRows((current) =>
      current.map((row) => {
        if (row.student.id !== studentId) return row;
        const hasSavedRecord = row.originalStatus !== null;
        return {
          ...row,
          status: row.originalStatus ?? "present",
          grade: row.originalGrade == null ? "" : String(row.originalGrade),
          note: row.originalNote,
          dirty: !hasSavedRecord,
        };
      })
    );
  }

  async function handleSaveAll() {
    if (!selectedLesson || pendingRows.length === 0 || hasInvalidGrades) return;
    setFormError(null);
    setSuccess(null);
    setSaving(true);
    try {
      await saveLessonJournalBatch(
        selectedLesson.id,
        pendingRows.map((row) => ({
          student_id: row.student.id,
          status: row.status,
          grade: row.grade.trim() === "" ? null : Number(row.grade),
          note: row.note.trim() || null,
        }))
      );
      setSuccess("Jurnal o'zgarishlari saqlandi.");
      await journal.reload();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!Number.isFinite(groupId)) return <ErrorState message="Guruh ID noto'g'ri." />;
  if (group.loading && !group.data) return <LoadingState />;
  if (group.error) return <ErrorState message={group.error} />;
  if (months.error) return <ErrorState message={months.error} />;
  if (allLessons.error) return <ErrorState message={allLessons.error} />;
  if (!currentGroup) return <ErrorState message="Guruh topilmadi." />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100/50">
      <div className="mx-auto max-w-[1600px] space-y-8 p-4 sm:p-6 lg:p-8">
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-cyan-900 shadow-2xl shadow-indigo-900/20">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20" />
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-gradient-to-br from-cyan-400/20 to-transparent blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-gradient-to-tr from-indigo-400/10 to-transparent blur-3xl" />

          <div className="relative space-y-8 p-6 sm:p-8 lg:grid lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-8 lg:space-y-0">
            <div>
              <NavLink
                to="/admin/groups"
                className="group inline-flex items-center gap-2 text-sm font-medium text-white/80 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30 rounded-md"
              >
                <ArrowLeft
                  size={16}
                  className="transition-transform group-hover:-translate-x-1"
                />
                Guruhlarga qaytish
              </NavLink>
              <h2 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-3xl">
                {currentGroup.name}
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {groupMeta(currentGroup).map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-cyan-100 backdrop-blur-sm ring-1 ring-white/20"
                  >
                    {item}
                  </span>
                ))}
                {groupMeta(currentGroup).length === 0 && (
                  <span className="text-sm text-white/70">
                    Guruh jadvali hali to'ldirilmagan
                  </span>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="group/stat rounded-2xl border border-white/20 bg-white/5 p-5 backdrop-blur-sm transition-all hover:bg-white/10 hover:shadow-lg">
                <User className="text-cyan-300" size={24} />
                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-cyan-100">
                  Studentlar
                </p>
                <p className="mt-1 text-3xl font-semibold tabular-nums">
                  {currentGroup.students_count}
                </p>
              </div>
              <div className="group/stat rounded-2xl border border-white/20 bg-white/5 p-5 backdrop-blur-sm transition-all hover:bg-white/10 hover:shadow-lg">
                <BookOpen className="text-cyan-300" size={24} />
                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-cyan-100">
                  Darslar
                </p>
                <p className="mt-1 text-3xl font-semibold tabular-nums">
                  {allLessonsData.length}
                </p>
              </div>
              <div className="group/stat rounded-2xl border border-white/20 bg-white/5 p-5 backdrop-blur-sm transition-all hover:bg-white/10 hover:shadow-lg">
                <GraduationCap className="text-purple-200" size={24} />
                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-cyan-100">
                  O'qituvchi
                </p>
                <p className="mt-1 truncate text-lg font-semibold">
                  {currentGroup.teacher?.full_name ?? "Biriktirilmagan"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Messages */}
        {formError && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-5 text-rose-800 shadow-sm backdrop-blur-sm animate-in slide-in-from-top-2">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-500" />
            <p className="text-sm font-medium">{formError}</p>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-emerald-800 shadow-sm backdrop-blur-sm animate-in slide-in-from-top-2">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-500" />
            <p className="text-sm font-medium">{success}</p>
          </div>
        )}

        {/* Main Journal Card */}
        <div className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 shadow-xl shadow-slate-200/20 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          
          <div className="relative border-b border-slate-200/80 p-8">
            <p className="text-xs font-medium uppercase tracking-wide text-sky-600">
              Lesson jurnali
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              Dars jurnali
            </h3>
            <p className="mt-3 text-base text-slate-500">
              Avval oy qo'shing yoki tanlang, keyin shu oy ichida darslarni boshqaring
            </p>
          </div>

          {/* Month Selection */}
          <div className="relative border-b border-slate-200/80 p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 ring-1 ring-sky-200/60">
                <Calendar size={16} />
                Oy bo'yicha filter
              </span>
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setSuccess(null);
                  setMonthDrawerOpen(true);
                }}
                className="group/btn inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-600 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-sky-500/20 transition-all hover:from-sky-600 hover:to-cyan-700 hover:shadow-lg active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
              >
                <Plus size={16} className="transition-transform group-hover/btn:rotate-90" />
                Yangi oy qo'shish
              </button>
            </div>

            {months.loading ? (
              <div className="py-12">
                <LoadingState />
              </div>
            ) : monthsData.length === 0 ? (
              <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
                <Info className="mb-3 text-slate-300" size={40} />
                <p className="font-semibold text-slate-700">Hali oy qo'shilmagan</p>
                <p className="mt-1 text-sm text-slate-500">
                  Dars jurnalini boshlash uchun birinchi oyni qo'shing.
                </p>
              </div>
            ) : (
              <div className="mt-6 flex flex-wrap gap-3">
                {monthsData.map((month) => {
                  const active = month.id === selectedMonthId;
                  return (
                    <button
                      key={month.id}
                      type="button"
                      onClick={() => {
                        setSelectedMonthId(month.id);
                        setSelectedLessonId(null);
                      }}
                      className={`group/month relative inline-flex items-center gap-4 overflow-hidden rounded-2xl px-6 py-4 text-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 ${
                        active
                          ? "bg-gradient-to-br from-sky-600 to-cyan-700 text-white shadow-lg shadow-sky-500/20"
                          : "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-sky-300 hover:shadow-md"
                      }`}
                    >
                      {monthLabel(month)}
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          active
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {lessonsByMonth.get(month.id) ?? 0}
                      </span>
                      {active && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity group-hover/month:opacity-100" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lessons Grid */}
          <div className="relative border-b border-slate-200/80 bg-slate-50/30 p-8">
            {!selectedMonth ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
                <Info className="mb-3 text-slate-300" size={40} />
                <p className="font-semibold text-slate-700">
                  Darslarni ko'rish uchun oy tanlang
                </p>
              </div>
            ) : (
              <>
                <div className="mb-6 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h4 className="text-xl font-semibold text-slate-900">
                      {monthLabel(selectedMonth)} darslari
                    </h4>
                    <p className="mt-1 text-sm text-slate-500">
                      {lessonsData.length} ta dars topildi
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {selectedLesson && (
                      <span className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700">
                        <BookOpen size={16} className="text-sky-600" />
                        Tanlangan: {selectedLessonNumber}-dars
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleCreateLesson()}
                      disabled={saving}
                      className="group/btn inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-emerald-500/20 transition-all hover:from-emerald-600 hover:to-cyan-700 hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    >
                      <Plus size={16} className="transition-transform group-hover/btn:rotate-90" />
                      Yangi dars qo'shish
                    </button>
                  </div>
                </div>

                {monthLessons.loading ? (
                  <div className="py-12">
                    <LoadingState />
                  </div>
                ) : lessonsData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
                    <Info className="mb-3 text-slate-300" size={40} />
                    <p className="font-semibold text-slate-700">
                      Bu oyda dars yo'q
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Yangi dars qo'shish tugmasi orqali birinchi lesson yarating.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {lessonsData.map((lesson, index) => {
                      const active = lesson.id === selectedLessonId;
                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() => setSelectedLessonId(lesson.id)}
                          className={`group/lesson relative overflow-hidden rounded-2xl border bg-white p-5 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 ${
                            active
                              ? "border-sky-400 shadow-lg shadow-sky-100 ring-2 ring-sky-300/50"
                              : "border-slate-200 shadow-sm hover:border-sky-300 hover:shadow-md"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                {index + 1}-dars
                              </span>
                              {active && (
                                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                                  Tanlangan
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2 text-slate-400 transition-transform group-hover/lesson:scale-110">
                              <Eye size={16} />
                              <Edit3 size={16} />
                            </div>
                          </div>
                          <p className="mt-4 text-lg font-semibold text-slate-900">
                            {lesson.title || "Mavzu kiritilmagan"}
                          </p>
                          <p className="mt-2 text-sm font-medium text-sky-600">
                            {dateFormatter.format(new Date(lesson.datetime))}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Journal Table */}
          <div className="relative">
            {!selectedLesson ? (
              <div className="flex flex-col items-center justify-center p-16 text-center">
                <Info className="mb-3 text-slate-300" size={40} />
                <p className="font-semibold text-slate-700">
                  Student jurnalini ko'rish uchun dars tanlang
                </p>
              </div>
            ) : journal.loading ? (
              <div className="p-12">
                <LoadingState />
              </div>
            ) : journal.error ? (
              <div className="p-8">
                <ErrorState message={journal.error} />
              </div>
            ) : draftRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 text-center">
                <Users className="mb-3 text-slate-300" size={40} />
                <p className="font-semibold text-slate-700">
                  Bu guruhda studentlar yo'q
                </p>
              </div>
            ) : (
              <>
                {/* Table Header */}
                <div className="hidden grid-cols-[1.5fr_0.4fr_0.6fr_0.6fr_0.9fr_0.5fr] bg-slate-50/80 px-6 py-4 text-xs font-medium uppercase tracking-wide text-slate-500 lg:grid">
                  <span>Student</span>
                  <span>Holati</span>
                  <span>Davomat</span>
                  <span>Baho (0-100)</span>
                  <span>Izoh</span>
                  <span className="text-right">Amal</span>
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-slate-100">
                  {draftRows.map((row) => {
                    const gradeValid = isGradeValid(row.grade);
                    return (
                      <div
                        key={row.student.id}
                        className="grid grid-cols-1 gap-4 px-6 py-5 transition-all hover:bg-slate-50/50 lg:grid-cols-[1.5fr_0.4fr_0.6fr_0.6fr_0.9fr_0.5fr] lg:items-center lg:gap-0"
                      >
                        {/* Student info */}
                        <div className="flex items-center gap-4">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-indigo-100 text-sm font-medium text-sky-700 ring-1 ring-sky-200/60">
                            {initials(row)}
                          </div>
                          <p className="text-base font-semibold text-slate-900">
                            {studentName(row)}
                          </p>
                        </div>

                        {/* Status badge */}
                        <span
                          className={`w-fit rounded-full px-3 py-1 text-xs font-medium ring-1 ${
                            row.student.is_active
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-200/60"
                              : "bg-slate-100 text-slate-600 ring-slate-200/60"
                          }`}
                        >
                          {row.student.is_active ? "Faol" : "Nofaol"}
                        </span>

                        {/* Attendance toggles */}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateDraft(row.student.id, { status: "present" })
                            }
                            className={`group/btn flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 ${
                              row.status === "present"
                                ? "border-emerald-500 bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-md shadow-emerald-200"
                                : "border-slate-200 bg-white text-slate-400 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600"
                            }`}
                            aria-label={`${studentName(row)} keldi`}
                          >
                            <Check size={18} className="transition-transform group-hover/btn:scale-110" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateDraft(row.student.id, { status: "absent" })
                            }
                            className={`group/btn flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 ${
                              row.status === "absent"
                                ? "border-rose-500 bg-gradient-to-br from-rose-500 to-red-500 text-white shadow-md shadow-rose-200"
                                : "border-slate-200 bg-white text-slate-400 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                            }`}
                            aria-label={`${studentName(row)} kelmadi`}
                          >
                            <X size={18} className="transition-transform group-hover/btn:scale-110" />
                          </button>
                        </div>

                        {/* Grade input */}
                        <div>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={row.grade}
                            onChange={(event) =>
                              updateDraft(row.student.id, { grade: event.target.value })
                            }
                            className={`w-full rounded-xl border px-3 py-2.5 text-center text-sm outline-none transition-all placeholder:text-slate-400 focus:ring-2 ${
                              gradeValid
                                ? "border-slate-200 bg-white focus:border-sky-400 focus:ring-sky-100"
                                : "border-rose-300 bg-rose-50/50 focus:border-rose-400 focus:ring-rose-100"
                            }`}
                            placeholder="0-100"
                          />
                          {!gradeValid && (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                              0-100 oralig'ida
                            </p>
                          )}
                        </div>

                        {/* Note input */}
                        <input
                          value={row.note}
                          onChange={(event) =>
                            updateDraft(row.student.id, { note: event.target.value })
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                          placeholder="Izoh"
                        />

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3">
                          <span
                            className={`text-xs font-medium ${
                              row.dirty ? "text-amber-600" : "text-emerald-600"
                            }`}
                          >
                            {row.dirty ? "Kutilmoqda" : "Saqlandi"}
                          </span>
                          <button
                            type="button"
                            onClick={() => resetDraft(row.student.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-500 transition-all hover:bg-rose-100 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-400"
                            aria-label={`${studentName(row)} o'zgarishini bekor qilish`}
                          >
                            <X size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer save section */}
                <div className="flex flex-col gap-5 border-t border-slate-200 bg-slate-50/80 px-6 py-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h4 className="text-base font-semibold text-slate-900">
                      Umumiy saqlash
                    </h4>
                    <p className="mt-1 text-sm text-slate-500">
                      {pendingRows.length} ta student bo'yicha o'zgarish tayyor
                      {hasInvalidGrades ? ". Baho qiymatlarini tekshiring" : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSaveAll()}
                    disabled={saving || pendingRows.length === 0 || hasInvalidGrades}
                    className="group/btn inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-3 text-sm font-medium text-white shadow-md shadow-slate-900/20 transition-all hover:from-slate-900 hover:to-slate-950 hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                  >
                    <Save size={16} className="transition-transform group-hover/btn:scale-110" />
                    {saving ? "Saqlanmoqda..." : "Hammasini saqlash"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Premium Drawer for adding month */}
      {monthDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-all animate-in fade-in"
          onClick={() => setMonthDrawerOpen(false)}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="month-drawer-title"
            className="ml-auto flex h-full w-full max-w-lg flex-col bg-white shadow-2xl animate-in slide-in-from-right"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-cyan-900 p-8 text-white">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                    <Calendar size={22} />
                  </span>
                  <div>
                    <h3
                      id="month-drawer-title"
                      className="text-xl font-semibold tracking-tight"
                    >
                      Yangi oy qo'shish
                    </h3>
                    <p className="mt-2 text-sm text-white/70">
                      Avval oy ochiladi, keyin ichidan dars qo'shasiz
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMonthDrawerOpen(false)}
                  className="rounded-full p-2 text-white/70 transition-all hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  aria-label="Yopish"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Drawer Form */}
            <form
              onSubmit={handleCreateMonth}
              className="flex-1 space-y-6 overflow-y-auto p-8"
            >
              <div className="space-y-2">
                <label
                  htmlFor="lesson-month"
                  className="text-sm font-medium text-slate-700"
                >
                  Oy
                </label>
                <div className="relative">
                  <input
                    id="lesson-month"
                    type="month"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    value={newMonth}
                    onChange={(event) => setNewMonth(event.target.value)}
                    required
                  />
                  <Clock
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                </div>
                {newMonth && (
                  <p className="text-sm font-medium text-slate-500">
                    Yangi oy{" "}
                    {monthFormatter.format(new Date(`${newMonth}-01T00:00:00.000Z`))}{" "}
                    dan davom etadi
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sm text-sky-800">
                Oy saqlangach, shu oy blokida `Yangi dars qo'shish` tugmasi orqali
                lesson qo'shasiz.
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="group/btn inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-700 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-sky-500/20 transition-all hover:from-sky-700 hover:to-cyan-800 hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                >
                  {saving ? (
                    "Saqlanmoqda..."
                  ) : (
                    <>
                      <Save size={16} className="transition-transform group-hover/btn:scale-110" />
                      Oyni saqlash
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setMonthDrawerOpen(false)}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                >
                  Bekor qilish
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}

