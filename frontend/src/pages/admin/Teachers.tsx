import { useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Info,
  Link2,
  Mail,
  Phone,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { getErrorMessage } from "../../api/client";
import { assignTeacher, getGroups, removeTeacher } from "../../api/groups";
import { createTeacher, getTeachers } from "../../api/teachers";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { useAsyncData } from "../../hooks/useAsyncData";
import type { Group, Teacher, TeacherPayload } from "../../types";

type DrawerMode = "add" | "assign" | null;

type AddTeacherForm = {
  name: string;
  email: string;
  password: string;
  phone_number: string;
  direction: string;
  hire_date: string;
  bio: string;
};

type AddTeacherErrors = Partial<Record<keyof AddTeacherForm, string>>;

type AssignErrors = {
  teacherId?: string;
  groupId?: string;
};

const today = new Date().toISOString().slice(0, 10);

const emptyTeacherForm: AddTeacherForm = {
  name: "",
  email: "",
  password: "",
  phone_number: "",
  direction: "",
  hire_date: today,
  bio: "",
};

function teacherInitial(teacher: Teacher) {
  return teacher.name.trim().charAt(0).toUpperCase() || "O";
}

function groupDescription(group: Group) {
  return [group.course_name, group.level].filter(Boolean).join(" / ");
}

export default function Teachers() {
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState<DrawerMode>(null);
  const [addForm, setAddForm] = useState<AddTeacherForm>(emptyTeacherForm);
  const [addErrors, setAddErrors] = useState<AddTeacherErrors>({});
  const [assignForm, setAssignForm] = useState({ teacherId: "", groupId: "" });
  const [assignErrors, setAssignErrors] = useState<AssignErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyGroupId, setBusyGroupId] = useState<number | null>(null);

  const teachers = useAsyncData(getTeachers, []);
  const groups = useAsyncData(() => getGroups({ limit: 500 }), []);

  const teachersData = teachers.data ?? [];
  const groupsData = groups.data ?? [];

  const groupsByTeacher = useMemo(() => {
    const map = new Map<number, Group[]>();
    groupsData.forEach((group) => {
      if (!group.teacher_id) return;
      const list = map.get(group.teacher_id) ?? [];
      list.push(group);
      map.set(group.teacher_id, list);
    });
    return map;
  }, [groupsData]);

  const assignedTeacherIds = useMemo(
    () => new Set(groupsData.map((group) => group.teacher_id).filter(Boolean) as number[]),
    [groupsData]
  );
  const availableTeachers = teachersData.filter((teacher) => !assignedTeacherIds.has(teacher.id));
  const availableGroups = groupsData.filter((group) => group.is_active);
  const assignedTeachers = assignedTeacherIds.size;
  const unassignedTeachers = Math.max(teachersData.length - assignedTeachers, 0);

  const filteredTeachers = teachersData.filter((teacher) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    const teacherGroups = groupsByTeacher.get(teacher.id) ?? [];
    return (
      teacher.name.toLowerCase().includes(query) ||
      teacher.email.toLowerCase().includes(query) ||
      teacher.phone_number.includes(search.trim()) ||
      (teacher.direction ?? "").toLowerCase().includes(query) ||
      (teacher.bio ?? "").toLowerCase().includes(query) ||
      teacherGroups.some((group) =>
        `${group.name} ${group.course_name ?? ""} ${group.level ?? ""}`
          .toLowerCase()
          .includes(query)
      )
    );
  });

  async function reloadPageData() {
    await Promise.all([teachers.reload(), groups.reload()]);
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
    const errors: AddTeacherErrors = {};
    if (addForm.name.trim().length < 2) errors.name = "F.I.Sh to'liq kiriting.";
    if (!addForm.email.trim()) errors.email = "Email kiriting.";
    if (addForm.password.length < 6)
      errors.password = "Parol kamida 6 belgidan iborat bo'lishi kerak.";
    if (addForm.phone_number.trim().length < 5)
      errors.phone_number = "Telefon raqamini to'liq kiriting.";
    setAddErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleCreateTeacher(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);
    if (!validateAddForm()) return;

    const payload: TeacherPayload = {
      name: addForm.name.trim(),
      email: addForm.email.trim(),
      password: addForm.password,
      phone_number: addForm.phone_number.trim(),
      direction: addForm.direction.trim() || null,
      hire_date: addForm.hire_date || null,
      bio: addForm.bio.trim() || null,
    };

    setSaving(true);
    try {
      await createTeacher(payload);
      setAddForm(emptyTeacherForm);
      closeDrawer();
      setSuccess("Yangi o'qituvchi yaratildi.");
      await reloadPageData();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function validateAssignForm() {
    const errors: AssignErrors = {};
    if (!Number(assignForm.teacherId)) errors.teacherId = "O'qituvchini tanlang.";
    if (!Number(assignForm.groupId)) errors.groupId = "Guruhni tanlang.";
    setAssignErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleAssignTeacher(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);
    if (!validateAssignForm()) return;

    setSaving(true);
    try {
      await assignTeacher(Number(assignForm.groupId), Number(assignForm.teacherId));
      setAssignForm({ teacherId: "", groupId: "" });
      closeDrawer();
      setSuccess("O'qituvchi guruhga biriktirildi.");
      await reloadPageData();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveTeacherFromGroup(group: Group, teacher: Teacher) {
    const confirmed = window.confirm(
      `${teacher.name} o'qituvchisini ${group.name} guruhidan chiqarasizmi?`
    );
    if (!confirmed) return;

    setFormError(null);
    setSuccess(null);
    setBusyGroupId(group.id);
    try {
      await removeTeacher(group.id, teacher.id);
      setSuccess("O'qituvchi guruhdan chiqarildi.");
      await reloadPageData();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setBusyGroupId(null);
    }
  }

  if (teachers.loading && !teachers.data) return <LoadingState />;
  if (teachers.error) return <ErrorState message={teachers.error} />;
  if (groups.error) return <ErrorState message={groups.error} />;

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-cyan-700 to-blue-800 p-8 text-white shadow-2xl shadow-cyan-900/20">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-gradient-to-br from-cyan-300/20 to-transparent blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-64 w-64 rounded-full bg-gradient-to-tr from-blue-300/10 to-transparent blur-3xl" />

        <div className="relative space-y-8 lg:grid lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-8 lg:space-y-0">
          <div>
            <span className="inline-flex rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-cyan-100 backdrop-blur-sm ring-1 ring-white/10">
              Teacher markazi
            </span>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-3xl">
              O'qituvchi boshqaruvi
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-cyan-50/80">
              O'qituvchilarni yarating, ularni guruhlarga biriktiring va faoliyatini
              kuzating
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/20 bg-white/5 p-5 backdrop-blur-sm ring-1 ring-white/10 transition-all hover:bg-white/10">
              <Users className="text-cyan-200" size={24} />
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-cyan-100">
                Jami teacher
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">
                {teachersData.length}
              </p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/5 p-5 backdrop-blur-sm ring-1 ring-white/10 transition-all hover:bg-white/10">
              <BookOpen className="text-emerald-200" size={24} />
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-cyan-100">
                Biriktirilgan
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">
                {assignedTeachers}
              </p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/5 p-5 backdrop-blur-sm ring-1 ring-white/10 transition-all hover:bg-white/10">
              <Users className="text-amber-200" size={24} />
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-cyan-100">
                Bo'sh teacher
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">
                {unassignedTeachers}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ActionCard
          title="Yangi o'qituvchi qo'shish"
          description="Email, parol va shaxsiy ma'lumotlar bilan o'qituvchi profili yarating"
          icon={<Plus size={24} />}
          buttonLabel="O'qituvchi yaratish"
          onClick={() => openDrawer("add")}
          gradient="from-sky-600 to-cyan-700"
        />
        <ActionCard
          title="Guruhga biriktirish"
          description="Mavjud o'qituvchilarni guruhlarga biriktiring va darslarini boshqaring"
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

      {/* Teachers List */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-slate-900">
              O'qituvchilar ro'yxati
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Barcha o'qituvchilar va ularning ma'lumotlari
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
              placeholder="Ism, email yoki yo'nalish bo'yicha qidirish"
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
          {teachers.loading ? (
            <div className="p-12">
              <LoadingState />
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <Users className="mb-4 h-14 w-14 text-slate-300" />
              <p className="text-base font-semibold text-slate-700">
                Hech qanday o'qituvchi topilmadi
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Yangi o'qituvchi qo'shing yoki qidiruvni o'zgartiring
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTeachers.map((teacher) => {
                const teacherGroups = groupsByTeacher.get(teacher.id) ?? [];

                return (
                  <article
                    key={teacher.id}
                    className="grid gap-6 p-6 transition-colors hover:bg-slate-50/50 lg:grid-cols-[1fr_0.92fr]"
                  >
                    <div className="flex items-start gap-5">
                      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-cyan-100 text-lg font-semibold text-sky-700 shadow-sm ring-1 ring-sky-200/60">
                        {teacherInitial(teacher)}
                        <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xl font-semibold tracking-tight text-slate-900">
                            {teacher.name}
                          </h4>
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200/60">
                            Faol
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <Mail size={14} className="text-slate-400" />
                            {teacher.email}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Phone size={14} className="text-slate-400" />
                            {teacher.phone_number}
                          </span>
                          {teacher.direction && (
                            <span className="inline-flex items-center gap-1.5">
                              <BookOpen size={14} className="text-slate-400" />
                              {teacher.direction}
                            </span>
                          )}
                          {teacher.hire_date && (
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays size={14} className="text-slate-400" />
                              {new Date(teacher.hire_date).toLocaleDateString("uz-UZ")}
                            </span>
                          )}
                        </div>

                        {teacher.bio && (
                          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-500">
                            {teacher.bio}
                          </p>
                        )}

                        <button
                          type="button"
                          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-sky-600 transition-colors hover:text-sky-700"
                        >
                          Ko'proq ma'lumot
                          <span className="text-lg leading-none">в†’</span>
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-5">
                      <h5 className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Users size={16} className="text-sky-600" />
                        Biriktirilgan guruhlar ({teacherGroups.length})
                      </h5>

                      {teacherGroups.length > 0 ? (
                        <div className="mt-4 space-y-3">
                          {teacherGroups.map((group) => {
                            const description = groupDescription(group);
                            return (
                              <div
                                key={group.id}
                                className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <p className="font-semibold text-slate-900">
                                      {group.name}
                                    </p>
                                    {description && (
                                      <p className="mt-1 text-sm text-slate-500">
                                        {description}
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleRemoveTeacherFromGroup(group, teacher)
                                    }
                                    disabled={busyGroupId === group.id}
                                    className="rounded-lg p-2 text-rose-500 transition-all hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                                    aria-label="Guruhdan chiqarish"
                                  >
                                    {busyGroupId === group.id ? (
                                      <span className="block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    ) : (
                                      <Trash2 size={16} />
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
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
              drawer === "add" ? "add-teacher-title" : "assign-teacher-title"
            }
            className="ml-auto flex h-full w-full max-w-lg flex-col bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {drawer === "add" ? (
              <>
                {/* Add Teacher Drawer Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-sky-600 via-cyan-700 to-blue-800 px-8 py-7 text-white">
                  <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                  <div className="relative flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                        <Plus size={22} />
                      </span>
                      <div>
                        <h3
                          id="add-teacher-title"
                          className="text-xl font-semibold tracking-tight"
                        >
                          Yangi o'qituvchi qo'shish
                        </h3>
                        <p className="mt-1 text-sm text-white/70">
                          O'qituvchi ma'lumotlarini to'liq kiriting
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

                {/* Add Teacher Form */}
                <form
                  onSubmit={handleCreateTeacher}
                  className="flex-1 space-y-6 overflow-y-auto p-8"
                >
                  <FormField label="F.I.Sh *" error={addErrors.name}>
                    <input
                      className="input-premium"
                      value={addForm.name}
                      onChange={(e) =>
                        setAddForm({ ...addForm, name: e.target.value })
                      }
                      placeholder="O'qituvchi ismi"
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
                        placeholder="Teacher login paroli"
                        autoComplete="new-password"
                      />
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

                    <FormField label="Yo'nalishi">
                      <input
                        className="input-premium"
                        value={addForm.direction}
                        onChange={(e) =>
                          setAddForm({ ...addForm, direction: e.target.value })
                        }
                        placeholder="Frontend, Backend, Ingliz tili"
                      />
                    </FormField>
                  </div>

                  <FormField label="Ishga kirgan sana">
                    <input
                      type="date"
                      className="input-premium"
                      value={addForm.hire_date}
                      onChange={(e) =>
                        setAddForm({ ...addForm, hire_date: e.target.value })
                      }
                    />
                  </FormField>

                  <FormField label="Bio">
                    <textarea
                      className="input-premium min-h-28 resize-y"
                      value={addForm.bio}
                      onChange={(e) =>
                        setAddForm({ ...addForm, bio: e.target.value })
                      }
                      placeholder="O'qituvchi haqida qisqacha ma'lumot"
                    />
                  </FormField>

                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-sm text-emerald-800">
                    <span className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                      O'qituvchi ushbu email va parol bilan tizimga kirishi mumkin
                    </span>
                  </div>

                  <div className="sticky bottom-0 -mx-8 flex gap-3 border-t border-slate-200 bg-white/95 px-8 py-5 backdrop-blur-sm">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-sky-600 to-cyan-700 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-sky-500/20 transition-all hover:from-sky-700 hover:to-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? "Yaratilmoqda..." : "O'qituvchi yaratish"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddForm(emptyTeacherForm);
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
                {/* Assign Teacher Drawer Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-cyan-700 to-cyan-800 px-8 py-7 text-white">
                  <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                  <div className="relative flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                        <Link2 size={22} />
                      </span>
                      <div>
                        <h3
                          id="assign-teacher-title"
                          className="text-xl font-semibold tracking-tight"
                        >
                          Guruhga biriktirish
                        </h3>
                        <p className="mt-1 text-sm text-white/70">
                          O'qituvchini guruhga qo'shing
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

                {/* Assign Teacher Form */}
                <form
                  onSubmit={handleAssignTeacher}
                  className="flex-1 space-y-6 overflow-y-auto p-8"
                >
                  <FormField
                    label="O'qituvchini tanlang *"
                    error={assignErrors.teacherId}
                  >
                    <select
                      className="input-premium"
                      value={assignForm.teacherId}
                      onChange={(e) =>
                        setAssignForm({ ...assignForm, teacherId: e.target.value })
                      }
                      disabled={availableTeachers.length === 0}
                    >
                      <option value="">O'qituvchini tanlang</option>
                      {availableTeachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name}
                          {teacher.direction ? ` - ${teacher.direction}` : ""}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-slate-500">
                      {availableTeachers.length > 0
                        ? `${availableTeachers.length} ta bo'sh o'qituvchi mavjud`
                        : "Bo'sh o'qituvchi mavjud emas"}
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
                      disabled={!assignForm.teacherId || availableGroups.length === 0}
                    >
                      <option value="">
                        {assignForm.teacherId
                          ? "Guruhni tanlang"
                          : "Avval o'qituvchini tanlang"}
                      </option>
                      {availableGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                          {group.course_name ? ` - ${group.course_name}` : ""}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-slate-500">
                      {assignForm.teacherId
                        ? "Guruh tanlangandan keyin jurnal va darslar o'qituvchi bilan bog'lanadi"
                        : "Avval o'qituvchini tanlang"}
                    </p>
                  </FormField>

                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-sm text-emerald-800">
                    <span className="flex items-start gap-3">
                      <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                      Biriktirilgandan keyin guruh ichidagi jurnal va darslar shu
                      o'qituvchi bilan bog'lanadi
                    </span>
                  </div>

                  <div className="sticky bottom-0 -mx-8 flex gap-3 border-t border-slate-200 bg-white/95 px-8 py-5 backdrop-blur-sm">
                    <button
                      type="submit"
                      disabled={
                        saving ||
                        availableTeachers.length === 0 ||
                        availableGroups.length === 0
                      }
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-600 to-cyan-700 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-700 hover:to-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? "Biriktirilmoqda..." : "Guruhga biriktirish"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAssignForm({ teacherId: "", groupId: "" });
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
          className={`mt-6 inline-flex min-w-48 items-center justify-center gap-2 rounded-xl bg-gradient-to-br ${gradient} px-5 py-3 text-sm font-medium text-white shadow-lg shadow-sky-500/20 transition-all hover:shadow-xl`}
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


