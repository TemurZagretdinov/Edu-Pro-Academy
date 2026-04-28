import { useMemo, useState, type ReactNode } from "react";
import { BookOpen, Phone, Search, ShieldAlert, Users, X } from "lucide-react";
import { NavLink } from "react-router-dom";

import {
  getMyAttendance,
  getMyGroups,
  getMyHomeworkStatuses,
  getMyStudents,
  getStudentProgress,
  notifyMyStudentParent,
} from "../../api/teacherPanel";
import { getErrorMessage } from "../../api/client";
import { TeacherRiskBadge } from "../../components/teacher/TeacherRiskBadge";
import { DataTable, type Column } from "../../components/tables/DataTable";
import { Button } from "../../components/ui/Button";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAsyncData } from "../../hooks/useAsyncData";
import type { Student } from "../../types";
import { buildTeacherStudentInsights, groupNameFromMap, resolveTeacherRisk, teacherStudentName } from "../../utils/teacherPanel";

type StatusFilter = "all" | "active" | "inactive";
type ParentFilter = "all" | "with" | "without";
type AttentionFilter = "all" | "needs_attention";

function todayDate() {
  const value = new Date();
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 10);
}

export default function MyStudents() {
  const students = useAsyncData(() => getMyStudents({ include_inactive: true }), []);
  const groups = useAsyncData(getMyGroups, []);
  const attendance = useAsyncData(() => getMyAttendance({ limit: 500 }), []);
  const homeworkStatuses = useAsyncData(getMyHomeworkStatuses, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [groupFilter, setGroupFilter] = useState(0);
  const [parentFilter, setParentFilter] = useState<ParentFilter>("all");
  const [attentionFilter, setAttentionFilter] = useState<AttentionFilter>("all");
  const [previewStudent, setPreviewStudent] = useState<Student | null>(null);
  const [notifyError, setNotifyError] = useState<string | null>(null);
  const [notifySuccess, setNotifySuccess] = useState<string | null>(null);
  const [notifyingType, setNotifyingType] = useState<"absent" | "late" | null>(null);

  const preview = useAsyncData(
    () => (previewStudent ? getStudentProgress(previewStudent.id) : Promise.resolve(null)),
    [previewStudent?.id],
  );

  const studentsData = students.data ?? [];
  const groupsData = groups.data ?? [];
  const groupsById = useMemo(() => new Map(groupsData.map((group) => [group.id, group])), [groupsData]);
  const insights = useMemo(
    () => buildTeacherStudentInsights(studentsData, attendance.data ?? [], homeworkStatuses.data ?? []),
    [attendance.data, homeworkStatuses.data, studentsData],
  );

  const filteredStudents = useMemo(() => {
    return studentsData.filter((student) => {
      const name = teacherStudentName(student).toLowerCase();
      const query = searchQuery.trim().toLowerCase();
      const insight = insights.get(student.id);

      if (statusFilter === "active" && !student.is_active) return false;
      if (statusFilter === "inactive" && student.is_active) return false;
      if (groupFilter && student.group_id !== groupFilter) return false;
      if (parentFilter === "with" && !student.parent_phone_number) return false;
      if (parentFilter === "without" && student.parent_phone_number) return false;
      if (attentionFilter === "needs_attention" && !insight?.needsAttention) return false;
      if (
        query &&
        !name.includes(query) &&
        !student.phone_number.toLowerCase().includes(query) &&
        !(student.parent_phone_number ?? "").toLowerCase().includes(query)
      ) {
        return false;
      }

      return true;
    });
  }, [attentionFilter, groupFilter, insights, parentFilter, searchQuery, statusFilter, studentsData]);

  const attentionCount = studentsData.filter((student) => insights.get(student.id)?.needsAttention).length;
  const activeStudents = studentsData.filter((student) => student.is_active).length;
  const withParentContact = studentsData.filter((student) => Boolean(student.parent_phone_number)).length;

  async function sendParentNotification(type: "absent" | "late") {
    if (!previewStudent) return;
    setNotifyError(null);
    setNotifySuccess(null);
    setNotifyingType(type);
    try {
      const result = await notifyMyStudentParent(previewStudent.id, {
        type,
        date: todayDate(),
      });
      setNotifySuccess(
        result.sent_count > 0
          ? "Ota-onaga bildirishnoma yuborildi."
          : "Bildirishnoma yuborish uchun bog'langan ota-ona topilmadi.",
      );
    } catch (error) {
      setNotifyError(getErrorMessage(error));
    } finally {
      setNotifyingType(null);
    }
  }

  const columns: Column<Student>[] = [
    {
      header: "Talaba",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-sm font-bold text-white">
            {row.firstname.charAt(0)}
            {row.lastname.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{teacherStudentName(row)}</p>
            <p className="text-xs text-slate-500">ID: {row.id}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Guruh",
      cell: (row) => (
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700">
          <BookOpen size={12} />
          {groupNameFromMap(row.group_id, groupsById)}
        </span>
      ),
    },
    {
      header: "Telefon",
      cell: (row) => (
        <a
          href={`tel:${row.phone_number}`}
          onClick={(event) => event.stopPropagation()}
          className="inline-flex items-center gap-2 text-slate-700 transition hover:text-sky-600"
        >
          <Phone size={14} className="text-slate-400" />
          {row.phone_number}
        </a>
      ),
    },
    {
      header: "Ota-ona",
      cell: (row) =>
        row.parent_phone_number ? (
          <a
            href={`tel:${row.parent_phone_number}`}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex items-center gap-2 text-slate-700 transition hover:text-sky-600"
          >
            <Phone size={14} className="text-slate-400" />
            {row.parent_phone_number}
          </a>
        ) : (
          <span className="text-slate-400">Kiritilmagan</span>
        ),
    },
    {
      header: "Holat",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <StatusBadge active={row.is_active} trueLabel="Faol" falseLabel="Nofaol" />
          <TeacherRiskBadge level={insights.get(row.id)?.riskLevel ?? "medium"} />
        </div>
      ),
    },
    {
      header: "Amal",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setPreviewStudent(row);
              setNotifyError(null);
              setNotifySuccess(null);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Ko'rish
          </button>
          <NavLink
            to={`/teacher/students/${row.id}`}
            onClick={(event) => event.stopPropagation()}
            className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
          >
            Progress
          </NavLink>
        </div>
      ),
    },
  ];

  if (students.loading || groups.loading) return <LoadingState />;
  if (students.error || groups.error) return <ErrorState message={students.error ?? groups.error ?? "Xatolik"} />;

  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-600 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <Users size={14} />
              O'qituvchi paneli
            </div>
            <h2 className="text-3xl font-bold">Mening talabalarim</h2>
            <p className="mt-2 max-w-2xl text-sm text-emerald-100">
              Qidiruv va filtrlardan foydalaning, so'ngra talabani ochib tezkor ma'lumot yoki progress sahifasiga o'ting.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatsBadge label="Jami" value={studentsData.length} />
            <StatsBadge label="Faol" value={activeStudents} />
            <StatsBadge label="Kontakt bor" value={withParentContact} />
            <StatsBadge label="Diqqat kerak" value={attentionCount} />
          </div>
        </div>
      </div>

      {(attendance.error || homeworkStatuses.error) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Talabalar analitikasi to'liq yuklanmadi. Filter va ro'yxat ishlaydi, lekin "diqqat kerak" hisobi cheklangan bo'lishi mumkin.
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Search size={16} className="text-slate-400" />
            Qidiruv va filtrlash
          </div>
        </div>

        <div className="grid gap-4 p-6 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Qidiruv</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Ism yoki telefon bo'yicha"
                className="w-full rounded-xl border border-slate-200 py-3 pl-9 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </label>

          <FilterSelect label="Holat" value={statusFilter} onChange={(value) => setStatusFilter(value as StatusFilter)}>
            <option value="all">Barchasi</option>
            <option value="active">Faol</option>
            <option value="inactive">Nofaol</option>
          </FilterSelect>

          <FilterSelect label="Guruh" value={String(groupFilter)} onChange={(value) => setGroupFilter(Number(value))}>
            <option value="0">Barcha guruhlar</option>
            {groupsData.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect label="Ota-ona kontakti" value={parentFilter} onChange={(value) => setParentFilter(value as ParentFilter)}>
            <option value="all">Barchasi</option>
            <option value="with">Kontakti bor</option>
            <option value="without">Kontakti yo'q</option>
          </FilterSelect>

          <FilterSelect label="Diqqat" value={attentionFilter} onChange={(value) => setAttentionFilter(value as AttentionFilter)}>
            <option value="all">Barchasi</option>
            <option value="needs_attention">Diqqat kerak</option>
          </FilterSelect>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Talabalar ro'yxati</h3>
              <p className="text-sm text-slate-500">{filteredStudents.length} ta natija</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              <ShieldAlert size={14} />
              Qator ustiga bosib tezkor ko'rinishni oching
            </div>
          </div>
        </div>

        <DataTable
          data={filteredStudents}
          columns={columns}
          onRowClick={(student) => {
            setPreviewStudent(student);
            setNotifyError(null);
            setNotifySuccess(null);
          }}
          emptyLabel={
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-3 h-12 w-12 text-slate-300" />
              <p className="font-semibold text-slate-700">Talaba topilmadi</p>
              <p className="mt-1 text-sm text-slate-500">Qidiruv yoki filtr shartlarini o'zgartirib ko'ring.</p>
            </div>
          }
          className="rounded-none border-0 shadow-none"
        />
      </div>

      {previewStudent && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setPreviewStudent(null)}>
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="teacher-student-preview-title"
            className="ml-auto flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 to-cyan-700 px-6 py-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">Tezkor ko'rinish</p>
                  <h3 id="teacher-student-preview-title" className="mt-2 text-2xl font-bold">
                    {teacherStudentName(previewStudent)}
                  </h3>
                  <p className="mt-1 text-sm text-emerald-100">{groupNameFromMap(previewStudent.group_id, groupsById)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewStudent(null)}
                  className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                  aria-label="Yopish"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {preview.loading && <LoadingState />}
              {preview.error && <ErrorState message={preview.error} />}
              {!preview.loading && !preview.error && preview.data && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoCard label="Telefon" value={preview.data.student.phone_number} />
                    <InfoCard label="Ota-ona telefoni" value={preview.data.student.parent_phone_number ?? "Kiritilmagan"} />
                    <InfoCard label="Holat" value={preview.data.student.is_active ? "Faol" : "Nofaol"} />
                        <InfoCard
                          label="Risk"
                          valueNode={
                            <TeacherRiskBadge
                              level={resolveTeacherRisk(preview.data.attendance_percent, preview.data.homework_percent)}
                            />
                          }
                        />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <MetricCard label="Davomat" value={`${preview.data.attendance_percent}%`} detail={`${preview.data.attendance_total} ta yozuv`} />
                    <MetricCard label="Vazifa" value={`${preview.data.homework_percent}%`} detail={`${preview.data.homework_total} ta vazifa`} />
                  </div>

                  {notifyError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                      {notifyError}
                    </div>
                  )}
                  {notifySuccess && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                      {notifySuccess}
                    </div>
                  )}

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-700">Tezkor amallar</p>
                    <div className="flex flex-wrap gap-2">
                      <NavLink
                        to={`/teacher/students/${previewStudent.id}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                      >
                        Progress sahifasi
                      </NavLink>
                      {preview.data.student.parent_phone_number && (
                        <a
                          href={`tel:${preview.data.student.parent_phone_number}`}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Ota-onaga qo'ng'iroq
                        </a>
                      )}
                      {preview.data.can_notify_parent && (
                        <>
                          <button
                            type="button"
                            onClick={() => void sendParentNotification("absent")}
                            disabled={notifyingType !== null}
                            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                          >
                            {notifyingType === "absent" ? "Yuborilmoqda..." : "Kelmadi deb yuborish"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void sendParentNotification("late")}
                            disabled={notifyingType !== null}
                            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
                          >
                            {notifyingType === "late" ? "Yuborilmoqda..." : "Kechikdi deb yuborish"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-700">So'nggi izohlar</p>
                    {preview.data.recent_notes.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                        Hozircha izoh yoki eslatma topilmadi.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {preview.data.recent_notes.map((item, index) => (
                          <div key={`${item.title}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                              <span className="text-xs text-slate-400">{item.created_at ? new Date(item.created_at).toLocaleDateString("uz-UZ") : "-"}</span>
                            </div>
                            <p className="mt-2 text-sm text-slate-600">{item.note}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-slate-200 px-6 py-4">
              <Button type="button" variant="secondary" className="w-full" onClick={() => setPreviewStudent(null)}>
                Yopish
              </Button>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="space-y-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
      >
        {children}
      </select>
    </label>
  );
}

function StatsBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function InfoCard({
  label,
  value,
  valueNode,
}: {
  label: string;
  value?: string;
  valueNode?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-2 text-sm font-medium text-slate-800">{valueNode ?? value}</div>
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </div>
  );
}

