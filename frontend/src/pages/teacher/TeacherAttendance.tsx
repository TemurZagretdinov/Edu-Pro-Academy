import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Calendar, CheckCircle2, Clock3, RotateCcw, Save, Users, XCircle, type LucideIcon } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import { getErrorMessage } from "../../api/client";
import { batchMarkMyAttendance, getMyAttendance, getMyGroupStudents, getMyGroups } from "../../api/teacherPanel";
import { Button } from "../../components/ui/Button";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { useAsyncData } from "../../hooks/useAsyncData";
import type { AttendanceStatus } from "../../types";
import { teacherStudentName } from "../../utils/teacherPanel";

type EditableAttendanceStatus = Extract<AttendanceStatus, "present" | "late" | "absent">;

type AttendanceDraft = {
  status: EditableAttendanceStatus;
  note: string;
};

type SaveState = "saved" | "changed" | "unsaved";

const statusOptions: Array<{
  value: EditableAttendanceStatus;
  label: string;
  icon: LucideIcon;
  activeClassName: string;
}> = [
  {
    value: "present",
    label: "Keldi",
    icon: CheckCircle2,
    activeClassName: "bg-emerald-600 text-white shadow-sm",
  },
  {
    value: "late",
    label: "Kechikdi",
    icon: Clock3,
    activeClassName: "bg-amber-500 text-white shadow-sm",
  },
  {
    value: "absent",
    label: "Kelmadi",
    icon: XCircle,
    activeClassName: "bg-rose-600 text-white shadow-sm",
  },
];

function todayDate() {
  const value = new Date();
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 10);
}

function normalizeStatus(status?: AttendanceStatus | null): EditableAttendanceStatus {
  if (status === "late" || status === "absent") return status;
  if (status === "excused") return "absent";
  return "present";
}

export default function TeacherAttendance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const groups = useAsyncData(getMyGroups, []);
  const [selectedGroupId, setSelectedGroupId] = useState(Number(searchParams.get("groupId") ?? 0));
  const [selectedDate, setSelectedDate] = useState(searchParams.get("date") ?? todayDate());
  const students = useAsyncData(
    () => (selectedGroupId ? getMyGroupStudents(selectedGroupId) : Promise.resolve([])),
    [selectedGroupId],
  );
  const attendance = useAsyncData(
    () =>
      selectedGroupId
        ? getMyAttendance({
            group_id: selectedGroupId,
            attendance_date: selectedDate || undefined,
            limit: 500,
          })
        : Promise.resolve([]),
    [selectedGroupId, selectedDate],
  );

  const [drafts, setDrafts] = useState<Record<number, AttendanceDraft>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    if (!selectedGroupId && groups.data?.length) {
      setSelectedGroupId(groups.data[0].id);
    }
  }, [groups.data, selectedGroupId]);

  useEffect(() => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (selectedGroupId) next.set("groupId", String(selectedGroupId));
        else next.delete("groupId");
        if (selectedDate) next.set("date", selectedDate);
        else next.delete("date");
        return next;
      },
      { replace: true },
    );
  }, [selectedDate, selectedGroupId, setSearchParams]);

  useEffect(() => {
    setDrafts({});
    setError(null);
    setSuccess(null);
  }, [selectedGroupId, selectedDate]);

  const selectedGroup = groups.data?.find((group) => group.id === selectedGroupId) ?? null;
  const selectedStudents = useMemo(
    () => [...(students.data ?? [])].sort((left, right) => teacherStudentName(left).localeCompare(teacherStudentName(right))),
    [students.data],
  );

  const attendanceByStudentId = useMemo(() => {
    const rows = new Map<number, AttendanceDraft>();
    for (const item of attendance.data ?? []) {
      if (item.group_id === selectedGroupId && item.date === selectedDate) {
        rows.set(item.student_id, {
          status: normalizeStatus(item.status),
          note: item.note ?? "",
        });
      }
    }
    return rows;
  }, [attendance.data, selectedDate, selectedGroupId]);

  const groupDisplayName = selectedGroup?.name?.trim() || (selectedGroupId ? `Guruh #${selectedGroupId}` : "Guruh tanlanmagan");
  const groupMeta = [selectedGroup?.course_name, selectedGroup?.level].filter(Boolean).join(" / ");

  function buildDraft(studentId: number, sourceDrafts: Record<number, AttendanceDraft>) {
    const saved = attendanceByStudentId.get(studentId);
    return sourceDrafts[studentId] ?? { status: saved?.status ?? "present", note: saved?.note ?? "" };
  }

  function getDraft(studentId: number): AttendanceDraft {
    return buildDraft(studentId, drafts);
  }

  function updateDraft(studentId: number, patch: Partial<AttendanceDraft>) {
    setDrafts((current) => ({
      ...current,
      [studentId]: {
        ...buildDraft(studentId, current),
        ...patch,
      },
    }));
  }

  function getSaveState(studentId: number): SaveState {
    const saved = attendanceByStudentId.get(studentId);
    const draft = drafts[studentId];
    if (!saved) return "unsaved";
    if (!draft) return "saved";
    if (draft.status !== saved.status || draft.note !== saved.note) return "changed";
    return "saved";
  }

  function resetAll() {
    setDrafts({});
    setSuccess(null);
    setError(null);
  }

  function applyBulkStatus(status: EditableAttendanceStatus) {
    const nextDrafts: Record<number, AttendanceDraft> = {};
    for (const student of selectedStudents) {
      nextDrafts[student.id] = {
        status,
        note: getDraft(student.id).note,
      };
    }
    setDrafts(nextDrafts);
  }

  async function saveAllAttendance() {
    if (!selectedGroupId || !selectedDate || selectedStudents.length === 0) {
      setError("Saqlash uchun guruh, sana va talabalar bo'lishi kerak.");
      return;
    }

    setError(null);
    setSuccess(null);
    setSavingAll(true);

    try {
      await batchMarkMyAttendance({
        group_id: selectedGroupId,
        date: selectedDate,
        items: selectedStudents.map((student) => {
          const draft = getDraft(student.id);
          return {
            student_id: student.id,
            status: draft.status,
            note: draft.note.trim() || null,
            reason: null,
          };
        }),
      });
      await attendance.reload();
      setDrafts({});
      setSuccess("Barcha davomat yozuvlari bir martada saqlandi.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingAll(false);
    }
  }

  const summary = useMemo(() => {
    const counts = {
      present: 0,
      late: 0,
      absent: 0,
    };

    for (const student of selectedStudents) {
      const status = getDraft(student.id).status;
      if (status === "present") counts.present += 1;
      if (status === "late") counts.late += 1;
      if (status === "absent") counts.absent += 1;
    }

    return counts;
  }, [attendanceByStudentId, drafts, selectedStudents]);

  const unsavedCount = useMemo(
    () => selectedStudents.filter((student) => getSaveState(student.id) !== "saved").length,
    [attendanceByStudentId, drafts, selectedStudents],
  );

  const hasAttendanceRows = Boolean(selectedGroupId && selectedStudents.length > 0);

  if (groups.loading && !groups.data) return <LoadingState />;
  if (groups.error) return <ErrorState message={groups.error} />;
  if ((students.loading && !students.data) || (attendance.loading && !attendance.data && selectedGroupId)) return <LoadingState />;
  if (students.error || attendance.error) return <ErrorState message={students.error ?? attendance.error ?? "Xatolik"} />;

  return (
    <section className={hasAttendanceRows ? "space-y-4 pb-32" : "space-y-4"}>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 text-white">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                <Calendar size={13} />
                Davomat
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold">Davomat belgilash</h2>
                {selectedGroupId > 0 && (
                  <SaveStateBadge
                    state={unsavedCount > 0 ? "changed" : "saved"}
                    label={unsavedCount > 0 ? `${unsavedCount} ta saqlanmagan` : "Hammasi saqlangan"}
                    compactOnDark
                  />
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 font-medium text-white/95">
                  <Users size={13} className="shrink-0" />
                  <span className="truncate">{groupDisplayName}</span>
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 font-medium text-white/95">
                  <Calendar size={13} />
                  {selectedDate}
                </span>
              </div>
              <p className="mt-2 text-sm text-blue-100">
                {selectedGroupId ? `${selectedStudents.length} ta talaba${groupMeta ? ` / ${groupMeta}` : ""}` : "Avval guruh va sanani tanlang."}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 bg-slate-50 px-5 py-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <label className="space-y-1.5 text-sm font-medium text-slate-700">
            <span>Guruh</span>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              value={selectedGroupId}
              onChange={(event) => setSelectedGroupId(Number(event.target.value))}
            >
              <option value={0}>Guruh tanlang</option>
              {(groups.data ?? []).map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 text-sm font-medium text-slate-700">
            <span>Sana</span>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {success}
        </div>
      )}

      {hasAttendanceRows && (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryCard label="Keldi" value={summary.present} icon={CheckCircle2} className="border-emerald-200 bg-emerald-50 text-emerald-700" />
            <SummaryCard label="Kechikdi" value={summary.late} icon={Clock3} className="border-amber-200 bg-amber-50 text-amber-700" />
            <SummaryCard label="Kelmadi" value={summary.absent} icon={XCircle} className="border-rose-200 bg-rose-50 text-rose-700" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">
                    <Users size={13} />
                    <span className="truncate">{groupDisplayName}</span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-slate-900">Davomat ro'yxati</h3>
                  <p className="text-sm text-slate-500">{selectedStudents.length} ta talaba / {selectedDate}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <CompactActionButton label="Hammasi keldi" onClick={() => applyBulkStatus("present")} tone="emerald" />
                  <CompactActionButton label="Hammasi kechikdi" onClick={() => applyBulkStatus("late")} tone="amber" />
                  <CompactActionButton label="Hammasi kelmadi" onClick={() => applyBulkStatus("absent")} tone="rose" />
                  <button
                    type="button"
                    onClick={resetAll}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <RotateCcw size={14} />
                    Reset
                  </button>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm text-emerald-800">
                Default holat `Keldi`. Faqat kerak bo'lsa `Kechikdi` yoki `Kelmadi` ga o'zgartiring, keyin oxirida bir marta saqlang.
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {selectedStudents.map((student) => {
                const draft = getDraft(student.id);
                const rowState = getSaveState(student.id);

                return (
                  <div
                    key={student.id}
                    className="grid gap-3 px-5 py-4 xl:grid-cols-[minmax(0,240px)_minmax(0,320px)_minmax(0,1fr)] xl:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">
                          {student.firstname.charAt(0)}
                          {student.lastname.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{teacherStudentName(student)}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span>{student.phone_number}</span>
                            <SaveStateBadge state={rowState} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-1">
                      <div className="grid grid-cols-3 gap-1">
                        {statusOptions.map((option) => {
                          const Icon = option.icon;
                          const active = draft.status === option.value;

                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => updateDraft(student.id, { status: option.value })}
                              className={`inline-flex h-9 items-center justify-center gap-1 rounded-lg px-2 text-xs font-semibold transition ${
                                active ? option.activeClassName : "bg-transparent text-slate-600 hover:bg-white"
                              }`}
                            >
                              <Icon size={14} />
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <input
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                      placeholder="Izoh yoki sabab (ixtiyoriy)"
                      value={draft.note}
                      onChange={(event) => updateDraft(student.id, { note: event.target.value })}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {selectedGroupId && selectedStudents.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <Users className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="font-semibold text-slate-700">Bu guruhda faol talaba topilmadi</p>
          <p className="mt-1 text-sm text-slate-500">Admin talabalarni biriktirgandan so'ng davomat shu yerda ko'rinadi.</p>
        </div>
      )}

      {!selectedGroupId && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
          <Calendar className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="font-semibold text-slate-700">Davomatni boshlash uchun guruh tanlang</p>
          <p className="mt-1 text-sm text-slate-500">Dashboard yoki jadval sahifasidan to'g'ridan to'g'ri shu bo'limga o'tishingiz ham mumkin.</p>
        </div>
      )}

      {hasAttendanceRows && (
        <div className="fixed inset-x-4 bottom-4 z-30 lg:left-[calc(16rem+2rem)] lg:right-8">
          <div className="rounded-2xl border border-sky-200 bg-white/95 shadow-xl shadow-sky-100/40 backdrop-blur">
            <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  {unsavedCount > 0 ? `${unsavedCount} ta yozuv saqlanmagan` : "Hammasi saqlangan"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {unsavedCount > 0
                    ? "Barcha qatorlar default Keldi holatida. Keraklilarini o'zgartirib, shu tugma bilan bir martada saqlang."
                    : "Yangi o'zgarish qilsangiz, shu tugma orqali hammasi birga saqlanadi."}
                </p>
              </div>
              <Button
                type="button"
                onClick={() => void saveAllAttendance()}
                disabled={savingAll || unsavedCount === 0}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm text-white shadow-lg shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={15} />
                {savingAll ? "Saqlanmoqda..." : "Hammasini saqlash"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function CompactActionButton({
  label,
  onClick,
  tone,
}: {
  label: string;
  onClick: () => void;
  tone: "emerald" | "amber" | "rose";
}) {
  const toneClasses = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    amber: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
    rose: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${toneClasses[tone]}`}
    >
      {label}
    </button>
  );
}

function SaveStateBadge({
  state,
  label,
  compactOnDark = false,
}: {
  state: SaveState;
  label?: string;
  compactOnDark?: boolean;
}) {
  const stateConfig = {
    saved: {
      text: "Saqlangan",
      className: compactOnDark
        ? "border border-emerald-200/40 bg-emerald-400/15 text-emerald-50"
        : "border border-emerald-200 bg-emerald-50 text-emerald-700",
      icon: CheckCircle2,
    },
    changed: {
      text: "O'zgartirilgan",
      className: compactOnDark
        ? "border border-amber-200/40 bg-amber-400/15 text-amber-50"
        : "border border-amber-200 bg-amber-50 text-amber-700",
      icon: AlertCircle,
    },
    unsaved: {
      text: "Saqlanmagan",
      className: compactOnDark
        ? "border border-rose-200/40 bg-rose-400/15 text-rose-50"
        : "border border-rose-200 bg-rose-50 text-rose-700",
      icon: AlertCircle,
    },
  } as const;

  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${config.className}`}>
      <Icon size={12} />
      {label ?? config.text}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  className: string;
}) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-1 text-xl font-bold">{value}</p>
        </div>
        <div className="rounded-xl bg-white/70 p-2">
          <Icon size={16} />
        </div>
      </div>
    </div>
  );
}
