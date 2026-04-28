import { useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Info,
  Link2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { getErrorMessage } from "../../api/client";
import {
  addStudentsToGroup,
  getGroups,
  getUnassignedStudents,
  removeStudentFromGroup,
} from "../../api/groups";
import {
  createStudent,
  getStudents,
  getStudentSummary,
} from "../../api/students";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { useAsyncData } from "../../hooks/useAsyncData";
import type {
  Group,
  StudentCreatePayload,
  StudentListItem,
} from "../../types";

type DrawerMode = "add" | "assign" | null;

type AddStudentForm = {
  fullName: string;
  email: string;
  password: string;
  phone_number: string;
  parent_phone_number: string;
  address: string;
  birth_date: string;
  registration_date: string;
  comment: string;
  trial_lesson_status: string;
  is_active: boolean;
};

type AddStudentErrors = Partial<Record<keyof AddStudentForm, string>>;

type AssignErrors = {
  studentId?: string;
  groupId?: string;
};

const today = new Date().toISOString().slice(0, 10);
const DEFAULT_STUDENT_PASSWORD = "12345678";

const emptyStudentForm: AddStudentForm = {
  fullName: "",
  email: "",
  password: DEFAULT_STUDENT_PASSWORD,
  phone_number: "",
  parent_phone_number: "",
  address: "",
  birth_date: "",
  registration_date: today,
  comment: "",
  trial_lesson_status: "joined",
  is_active: true,
};

function fullName(student: StudentListItem) {
  return `${student.firstname} ${student.lastname}`.trim();
}

function initials(student: StudentListItem) {
  return `${student.firstname.charAt(0)}${student.lastname.charAt(0)}`.toUpperCase();
}

function groupDescription(group: Group | undefined) {
  if (!group) return "";
  return [group.course_name, group.level].filter(Boolean).join(" / ");
}

export default function Students() {
  const [search, setSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [drawer, setDrawer] = useState<DrawerMode>(null);
  const [addForm, setAddForm] = useState<AddStudentForm>(emptyStudentForm);
  const [addErrors, setAddErrors] = useState<AddStudentErrors>({});
  const [assignForm, setAssignForm] = useState({ studentId: "", groupId: "" });
  const [assignErrors, setAssignErrors] = useState<AssignErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyStudentId, setBusyStudentId] = useState<number | null>(null);

  const students = useAsyncData(
    () =>
      getStudents({
        q: search.trim() || undefined,
        limit: 500,
      }),
    [search]
  );
  const groups = useAsyncData(
    () => getGroups({ limit: 500 }),
    []
  );
  const summary = useAsyncData(getStudentSummary, []);
  const availableStudents = useAsyncData(
    () =>
      getUnassignedStudents({
        q: studentSearch.trim() || undefined,
        is_active: true,
        limit: 500,
      }),
    [studentSearch]
  );

  const studentsData = students.data ?? [];
  const groupsData = groups.data ?? [];
  const availableStudentsData = availableStudents.data ?? [];
  const groupById = useMemo(
    () => new Map(groupsData.map((group) => [group.id, group])),
    [groupsData]
  );
  const selectedAssignGroup = assignForm.groupId ? groupsData.find((group) => group.id === Number(assignForm.groupId)) : undefined;
  const selectedAssignStudent = assignForm.studentId
    ? [...availableStudentsData, ...studentsData].find((student) => student.id === Number(assignForm.studentId))
    : undefined;

  const totalStudents = summary.data?.total_students ?? studentsData.length;
  const assignedStudents =
    summary.data?.assigned_students ??
    studentsData.filter((student) => student.group_id).length;
  const unassignedStudents =
    summary.data?.unassigned_students ??
    Math.max(totalStudents - assignedStudents, 0);

  async function reloadPageData() {
    await Promise.all([
      students.reload(),
      groups.reload(),
      summary.reload(),
      availableStudents.reload(),
    ]);
  }

  function openDrawer(mode: Exclude<DrawerMode, null>) {
    setDrawer(mode);
    setFormError(null);
    setSuccess(null);
    setAddErrors({});
    setAssignErrors({});
  }

  function closeDrawer() {
    setDrawer(null);
    setAddErrors({});
    setAssignErrors({});
  }

  function validateAddForm() {
    const errors: AddStudentErrors = {};
    const nameParts = addForm.fullName.trim().split(/\s+/).filter(Boolean);

    if (nameParts.length < 2)
      errors.fullName = "F.I.Sh kamida ism va familiyadan iborat bo'lishi kerak.";
    if (!addForm.email.trim()) errors.email = "Email kiriting.";
    if (addForm.password.length < 8)
      errors.password = "Parol kamida 8 belgidan iborat bo'lishi kerak.";
    if (addForm.phone_number.trim().length < 5)
      errors.phone_number = "Telefon raqamini to'liq kiriting.";

    setAddErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleCreateStudent(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);
    if (!validateAddForm()) return;

    const [firstname, ...lastNameParts] = addForm.fullName.trim().split(/\s+/);
    const payload: StudentCreatePayload = {
      firstname,
      lastname: lastNameParts.join(" "),
      email: addForm.email.trim(),
      password: addForm.password,
      phone_number: addForm.phone_number.trim(),
      parent_phone_number: addForm.parent_phone_number.trim() || null,
      birth_date: addForm.birth_date || null,
      gender: null,
      address: addForm.address.trim() || null,
      group_id: null,
      teacher_id: null,
      registration_date: addForm.registration_date || today,
      is_active: addForm.is_active,
      comment: addForm.comment.trim() || null,
      trial_lesson_status: addForm.trial_lesson_status,
      passport: null,
    };

    setSaving(true);
    try {
      await createStudent(payload);
      setAddForm(emptyStudentForm);
      closeDrawer();
      setSuccess(`Yangi o'quvchi yaratildi. Login email: ${payload.email || "yo'q"} В· Default parol: ${DEFAULT_STUDENT_PASSWORD}`);
      await reloadPageData();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function validateAssignForm() {
    const errors: AssignErrors = {};
    const studentId = Number(assignForm.studentId);
    const groupId = Number(assignForm.groupId);
    const selectedStudent = studentsData.find((student) => student.id === studentId);

    if (!studentId) errors.studentId = "O'quvchini tanlang.";
    if (!groupId) errors.groupId = "Guruhni tanlang.";
    if (selectedStudent?.group_id)
      errors.studentId = "Bu o'quvchi allaqachon guruhga biriktirilgan.";

    setAssignErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleAssignStudent(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);
    if (!validateAssignForm()) return;

    setSaving(true);
    try {
      await addStudentsToGroup(Number(assignForm.groupId), [
        Number(assignForm.studentId),
      ]);
      setAssignForm({ studentId: "", groupId: "" });
      setStudentSearch("");
      closeDrawer();
      setSuccess("O'quvchi guruhga muvaffaqiyatli biriktirildi вњ…");
      await reloadPageData();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleUnassignStudent(student: StudentListItem) {
    if (!student.group_id) return;
    const confirmed = window.confirm(
      `${fullName(student)} o'quvchisini guruhdan chiqarasizmi?`
    );
    if (!confirmed) return;

    setFormError(null);
    setSuccess(null);
    setBusyStudentId(student.id);
    try {
      await removeStudentFromGroup(student.group_id, student.id);
      setSuccess("O'quvchi guruhdan chiqarildi.");
      await reloadPageData();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setBusyStudentId(null);
    }
  }

  if (students.loading && !students.data) return <LoadingState />;
  if (students.error) return <ErrorState message={students.error} />;
  if (groups.error) return <ErrorState message={groups.error} />;
  if (summary.error) return <ErrorState message={summary.error} />;

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-cyan-700 to-blue-800 p-8 text-white shadow-2xl shadow-cyan-900/20">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-gradient-to-br from-cyan-300/20 to-transparent blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-64 w-64 rounded-full bg-gradient-to-tr from-blue-300/10 to-transparent blur-3xl" />

        <div className="relative space-y-8 lg:grid lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-8 lg:space-y-0">
          <div>
            <span className="inline-flex rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-cyan-100 backdrop-blur-sm ring-1 ring-white/10">
              Student markazi
            </span>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-3xl">
              O'quvchi boshqaruvi
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-cyan-50/80">
              O'quvchilarni yarating, ularni guruhlarga biriktiring va faoliyatini
              kuzating
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/20 bg-white/5 p-5 backdrop-blur-sm ring-1 ring-white/10 transition-all hover:bg-white/10">
              <Users className="text-cyan-200" size={24} />
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-cyan-100">
                Jami o'quvchi
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">
                {totalStudents}
              </p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/5 p-5 backdrop-blur-sm ring-1 ring-white/10 transition-all hover:bg-white/10">
              <BookOpen className="text-emerald-200" size={24} />
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-cyan-100">
                Biriktirilgan
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">
                {assignedStudents}
              </p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/5 p-5 backdrop-blur-sm ring-1 ring-white/10 transition-all hover:bg-white/10">
              <UserPlus className="text-amber-200" size={24} />
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-cyan-100">
                Bo'sh o'quvchi
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">
                {unassignedStudents}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ActionCard
          title="Yangi o'quvchi qo'shish"
          description="O'quvchi profili yaratish va ma'lumotlarini kiritish"
          icon={<Plus size={24} />}
          buttonLabel="O'quvchi yaratish"
          onClick={() => openDrawer("add")}
          gradient="from-sky-600 to-cyan-700"
        />
        <ActionCard
          title="Guruhga biriktirish"
          description="Mavjud o'quvchilarni guruhlarga biriktirish va boshqarish"
          icon={<Link2 size={24} />}
          buttonLabel="Biriktirish"
          onClick={() => openDrawer("assign")}
          gradient="from-sky-600 to-cyan-700"
        />
      </div>

      {/* Feedback Messages */}
      {formError && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-5 text-rose-800 shadow-sm backdrop-blur-sm">
          <X size={16} className="mt-0.5 shrink-0 text-rose-500" />
          <p className="text-sm font-medium">{formError}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-emerald-800 shadow-sm backdrop-blur-sm">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      {/* Students List */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-slate-900">
              O'quvchilar ro'yxati
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Barcha o'quvchilar va ularning ma'lumotlari
            </p>
          </div>
          <div className="relative w-full md:max-w-sm">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-11 text-sm text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ism, email, telefon yoki izoh bo'yicha qidirish"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700"
                aria-label="Qidiruvni tozalash"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/20">
          {students.loading ? (
            <div className="p-12">
              <LoadingState />
            </div>
          ) : studentsData.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <GraduationCap className="mb-4 h-14 w-14 text-slate-300" />
              <p className="text-base font-semibold text-slate-700">
                Hech qanday o'quvchi topilmadi
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Yangi o'quvchi qo'shing yoki qidiruvni o'zgartiring
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {studentsData.map((student) => {
                const group = student.group_id
                  ? groupById.get(student.group_id)
                  : undefined;
                const description = groupDescription(group);

                return (
                  <article
                    key={student.id}
                    className="grid gap-6 p-6 transition-colors hover:bg-slate-50/50 lg:grid-cols-[1fr_0.92fr]"
                  >
                    <div className="flex items-start gap-5">
                      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-cyan-100 text-lg font-semibold text-sky-700 shadow-sm ring-1 ring-sky-200/60">
                        {initials(student)}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                            student.is_active
                              ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"
                              : "bg-slate-400"
                          }`}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xl font-semibold tracking-tight text-slate-900">
                            {fullName(student)}
                          </h4>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                              student.is_active
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200/60"
                                : "bg-slate-100 text-slate-600 ring-slate-200/60"
                            }`}
                          >
                            {student.is_active ? "Faol" : "Nofaol"}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                          {student.email && (
                            <span className="inline-flex items-center gap-1.5">
                              <Mail size={14} className="text-slate-400" />
                              {student.email}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1.5">
                            <Phone size={14} className="text-slate-400" />
                            {student.phone_number}
                          </span>
                          {student.address && (
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin size={14} className="text-slate-400" />
                              <span className="truncate max-w-[180px]">
                                {student.address}
                              </span>
                            </span>
                          )}
                          {student.registration_date && (
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays size={14} className="text-slate-400" />
                              {new Date(student.registration_date).toLocaleDateString(
                                "uz-UZ"
                              )}
                            </span>
                          )}
                        </div>

                        {student.comment && (
                          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-500">
                            {student.comment}
                          </p>
                        )}

                        <NavLink
                          to={`/admin/students/${student.id}`}
                          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-sky-600 transition-colors hover:text-sky-700"
                        >
                          Ko'proq ma'lumot
                          <span className="text-lg leading-none">в†’</span>
                        </NavLink>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-5">
                      <div className="flex items-center justify-between">
                        <h5 className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                          <Users size={16} className="text-sky-600" />
                          Biriktirilgan guruh
                        </h5>
                      </div>

                      {student.group_id ? (
                        <div className="mt-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {group?.name ?? `Guruh #${student.group_id}`}
                              </p>
                              {description && (
                                <p className="mt-1 text-sm text-slate-500">
                                  {description}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleUnassignStudent(student)}
                              disabled={busyStudentId === student.id}
                              className="rounded-lg p-2 text-rose-500 transition-all hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label="Guruhdan chiqarish"
                            >
                              {busyStudentId === student.id ? (
                                <span className="block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 flex min-h-[100px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center">
                          <Info className="mb-2 text-slate-300" size={20} />
                          <p className="text-sm font-medium text-slate-500">
                            Hali guruh biriktirilmagan
                          </p>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Premium Drawer */}
      {drawer && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-all"
          onClick={closeDrawer}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby={
              drawer === "add" ? "add-student-title" : "assign-student-title"
            }
            className="ml-auto flex h-full w-full max-w-lg flex-col bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {drawer === "add" ? (
              <>
                {/* Add Student Drawer Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-sky-600 via-cyan-700 to-blue-800 px-8 py-7 text-white">
                  <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                  <div className="relative flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                        <Plus size={22} />
                      </span>
                      <div>
                        <h3
                          id="add-student-title"
                          className="text-xl font-semibold tracking-tight"
                        >
                          Yangi o'quvchi qo'shish
                        </h3>
                        <p className="mt-1 text-sm text-white/70">
                          O'quvchi ma'lumotlarini to'liq kiriting
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={closeDrawer}
                      className="rounded-full p-2 text-white/70 transition-all hover:bg-white/10 hover:text-white"
                      aria-label="Yopish"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Add Student Form */}
                <form
                  onSubmit={handleCreateStudent}
                  className="flex-1 space-y-6 overflow-y-auto p-8"
                >
                  <FormField label="F.I.Sh *" error={addErrors.fullName}>
                    <input
                      className="input-premium"
                      value={addForm.fullName}
                      onChange={(e) =>
                        setAddForm({ ...addForm, fullName: e.target.value })
                      }
                      placeholder="Ism Familiya"
                      autoComplete="name"
                    />
                  </FormField>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField label="Email *" error={addErrors.email}>
                      <input
                        type="email"
                        className="input-premium"
                        value={addForm.email}
                        onChange={(e) =>
                          setAddForm({ ...addForm, email: e.target.value })
                        }
                        placeholder="name@example.com"
                        autoComplete="email"
                      />
                    </FormField>

                    <FormField label="Parol *" error={addErrors.password}>
                      <input
                        type="password"
                        className="input-premium"
                        value={addForm.password}
                        onChange={(e) =>
                          setAddForm({ ...addForm, password: e.target.value })
                        }
                        placeholder="Student login paroli"
                        autoComplete="new-password"
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        Default parol: {DEFAULT_STUDENT_PASSWORD}. O'quvchi login qilgandan keyin parolini o'zgartirishi mumkin.
                      </p>
                    </FormField>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField
                      label="Telefon raqami *"
                      error={addErrors.phone_number}
                    >
                      <input
                        className="input-premium"
                        value={addForm.phone_number}
                        onChange={(e) =>
                          setAddForm({ ...addForm, phone_number: e.target.value })
                        }
                        placeholder="+998 90 123 45 67"
                        autoComplete="tel"
                      />
                    </FormField>

                    <FormField label="Ota-ona telefoni">
                      <input
                        className="input-premium"
                        value={addForm.parent_phone_number}
                        onChange={(e) =>
                          setAddForm({
                            ...addForm,
                            parent_phone_number: e.target.value,
                          })
                        }
                        placeholder="+998 90 123 45 67"
                        autoComplete="tel"
                      />
                    </FormField>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField label="Tug'ilgan sana">
                      <input
                        type="date"
                        className="input-premium"
                        value={addForm.birth_date}
                        onChange={(e) =>
                          setAddForm({ ...addForm, birth_date: e.target.value })
                        }
                      />
                    </FormField>

                    <FormField label="Qabul sanasi">
                      <input
                        type="date"
                        className="input-premium"
                        value={addForm.registration_date}
                        onChange={(e) =>
                          setAddForm({
                            ...addForm,
                            registration_date: e.target.value,
                          })
                        }
                      />
                    </FormField>
                  </div>

                  <FormField label="Manzil">
                    <input
                      className="input-premium"
                      value={addForm.address}
                      onChange={(e) =>
                        setAddForm({ ...addForm, address: e.target.value })
                      }
                      placeholder="Toshkent shahri, ..."
                      autoComplete="street-address"
                    />
                  </FormField>

                  <FormField label="Yo'nalishi / izoh">
                    <textarea
                      className="input-premium min-h-24 resize-y"
                      value={addForm.comment}
                      onChange={(e) =>
                        setAddForm({ ...addForm, comment: e.target.value })
                      }
                      placeholder="Masalan: Frontend, Backend, Ingliz tili yoki qo'shimcha izoh"
                    />
                  </FormField>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-medium text-slate-700 transition-all hover:border-slate-300">
                    <input
                      type="checkbox"
                      checked={addForm.is_active}
                      onChange={(e) =>
                        setAddForm({ ...addForm, is_active: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 transition-all focus:ring-2 focus:ring-sky-200"
                    />
                    Faol o'quvchi
                  </label>

                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-sm text-emerald-800">
                    <span className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                      O'quvchi ushbu email va parol orqali student panelga kira oladi.
                    </span>
                  </div>

                  <div className="sticky bottom-0 -mx-8 flex gap-3 border-t border-slate-200 bg-white/95 px-8 py-5 backdrop-blur-sm">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-sky-600 to-cyan-700 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-sky-500/20 transition-all hover:from-sky-700 hover:to-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? "Yaratilmoqda..." : "O'quvchi yaratish"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddForm(emptyStudentForm);
                        setAddErrors({});
                      }}
                      disabled={saving}
                      className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Tozalash
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                {/* Assign Student Drawer Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-cyan-700 to-cyan-800 px-8 py-7 text-white">
                  <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                  <div className="relative flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                        <Link2 size={22} />
                      </span>
                      <div>
                        <h3
                          id="assign-student-title"
                          className="text-xl font-semibold tracking-tight"
                        >
                          Guruhga biriktirish
                        </h3>
                        <p className="mt-1 text-sm text-white/70">
                          O'quvchini guruhga qo'shing
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={closeDrawer}
                      className="rounded-full p-2 text-white/70 transition-all hover:bg-white/10 hover:text-white"
                      aria-label="Yopish"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Assign Student Form */}
                <form
                  onSubmit={handleAssignStudent}
                  className="flex-1 space-y-6 overflow-y-auto p-8"
                >
                  <FormField label="O'quvchi qidirish">
                    <input
                      className="input-premium"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Ism, email yoki telefon bo'yicha"
                    />
                  </FormField>

                  <FormField
                    label="O'quvchini tanlang *"
                    error={assignErrors.studentId}
                  >
                    <select
                      className="input-premium"
                      value={assignForm.studentId}
                      onChange={(e) =>
                        setAssignForm({ ...assignForm, studentId: e.target.value })
                      }
                      disabled={
                        availableStudents.loading ||
                        availableStudentsData.length === 0
                      }
                    >
                      <option value="">
                        {availableStudents.loading
                          ? "Yuklanmoqda..."
                          : "O'quvchini tanlang"}
                      </option>
                      {availableStudentsData.map((student) => (
                        <option key={student.id} value={student.id}>
                          {fullName(student)} - {student.phone_number}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-slate-500">
                      {availableStudentsData.length > 0
                        ? `${availableStudentsData.length} ta bo'sh o'quvchi mavjud`
                        : "Bo'sh o'quvchi mavjud emas"}
                    </p>
                  </FormField>

                  <FormField
                    label="Guruhni tanlang *"
                    error={assignErrors.groupId}
                  >
                    <select
                      className="input-premium"
                      value={assignForm.groupId}
                      onChange={(e) =>
                        setAssignForm({ ...assignForm, groupId: e.target.value })
                      }
                      disabled={groups.loading || groupsData.length === 0}
                    >
                      <option value="">
                        {groups.loading ? "Yuklanmoqda..." : "Guruhni tanlang"}
                      </option>
                      {groupsData.map((group) => (
                        <option key={group.id} value={group.id} disabled={!group.is_active}>
                          {group.name}
                          {group.course_name ? ` вЂ” ${group.course_name}` : ""}
                          {` вЂ” ${group.teacher?.full_name ?? "O'qituvchi biriktirilmagan"}`}
                          {` вЂ” ${group.students_count} ta o'quvchi`}
                          {group.is_active ? " вЂ” Faol" : " вЂ” Nofaol вЂ” faollashtiring"}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-slate-500">
                      {groupsData.length > 0
                        ? "Yaratilgan guruhlar ro'yxatidan tanlang."
                        : "Hozircha guruh yaratilmagan. Avval guruh yarating."}
                    </p>
                  </FormField>

                  {groupsData.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-5 text-sm text-slate-600">
                      <p className="font-medium text-slate-800">Hozircha guruh mavjud emas. Avval guruh yarating.</p>
                      <NavLink to="/admin/groups" className="mt-3 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                        Guruh yaratish
                      </NavLink>
                    </div>
                  ) : selectedAssignGroup ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tanlangan guruh</p>
                      <h4 className="mt-2 text-lg font-semibold text-slate-900">{selectedAssignGroup.name}</h4>
                      <div className="mt-3 grid gap-2 text-sm text-slate-600">
                        <p>Kurs: {selectedAssignGroup.course_name || "-"}</p>
                        <p>O'qituvchi: {selectedAssignGroup.teacher?.full_name || "O'qituvchi biriktirilmagan"}</p>
                        <p>Dars vaqti: {[selectedAssignGroup.lesson_days, selectedAssignGroup.lesson_time].filter(Boolean).join(" ") || "-"}</p>
                        <p>Xona: {selectedAssignGroup.room || "-"}</p>
                        <p>O'quvchilar soni: {selectedAssignGroup.students_count}</p>
                        <p>Holat: {selectedAssignGroup.is_active ? "Faol" : "Nofaol"}</p>
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-sm text-emerald-800">
                    <span className="flex items-start gap-3">
                      <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                      {selectedAssignStudent && selectedAssignGroup
                        ? `${fullName(selectedAssignStudent)} ushbu guruh bilan bog'lanadi.`
                        : "Yaratilgan guruhlar ro'yxatidan tanlang."}
                    </span>
                  </div>

                  <div className="sticky bottom-0 -mx-8 flex gap-3 border-t border-slate-200 bg-white/95 px-8 py-5 backdrop-blur-sm">
                    <button
                      type="submit"
                      disabled={
                        saving ||
                        availableStudentsData.length === 0 ||
                        groupsData.length === 0 ||
                        !assignForm.studentId ||
                        !assignForm.groupId
                      }
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-600 to-cyan-700 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-700 hover:to-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? "Biriktirilmoqda..." : "Guruhga biriktirish"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAssignForm({ studentId: "", groupId: "" });
                        setAssignErrors({});
                      }}
                      disabled={saving}
                      className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Tozalash
                    </button>
                  </div>
                </form>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

/* Helper Components */

function ActionCard({
  title,
  description,
  icon,
  buttonLabel,
  onClick,
  gradient,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  buttonLabel: string;
  onClick: () => void;
  gradient: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-slate-100 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700 ring-1 ring-slate-200/60">
          {icon}
        </span>
        <h3 className="mt-6 text-xl font-semibold tracking-tight text-slate-900">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          {description}
        </p>
        <button
          type="button"
          onClick={onClick}
          className={`mt-6 inline-flex min-w-48 items-center justify-center gap-2 rounded-xl bg-gradient-to-br ${gradient} px-5 py-3 text-sm font-medium text-white shadow-lg shadow-sky-500/20 transition-all hover:shadow-xl disabled:opacity-60`}
        >
          <Plus size={16} />
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}


