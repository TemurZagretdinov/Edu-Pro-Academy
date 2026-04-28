import { useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  GraduationCap,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { getErrorMessage } from "../../api/client";
import {
  createGroup,
  deleteGroup,
  getGroups,
  updateGroup,
} from "../../api/groups";
import { getTeachers } from "../../api/teachers";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { useAsyncData } from "../../hooks/useAsyncData";
import type { Group, GroupPayload, Teacher } from "../../types";

type GroupFormState = {
  name: string;
  course_name: string;
  level: string;
  teacher_id: string;
  lesson_days: string;
  lesson_time: string;
  room: string;
  monthly_fee: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

type GroupFormErrors = Partial<Record<keyof GroupFormState, string>>;

const emptyGroupForm: GroupFormState = {
  name: "",
  course_name: "",
  level: "",
  teacher_id: "",
  lesson_days: "",
  lesson_time: "",
  room: "",
  monthly_fee: "",
  start_date: "",
  end_date: "",
  is_active: true,
};

function formatMoney(value?: string | null) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return "0 so'm";
  return `${new Intl.NumberFormat("uz-UZ").format(amount)} so'm`;
}

function groupInitial(group: Group) {
  return group.name.trim().charAt(0).toUpperCase() || "G";
}

function teacherName(group: Group, teachers: Teacher[]) {
  return (
    group.teacher?.full_name ??
    teachers.find((teacher) => teacher.id === group.teacher_id)?.name ??
    "Teacher biriktirilmagan"
  );
}

function formFromGroup(group: Group): GroupFormState {
  return {
    name: group.name,
    course_name: group.course_name ?? "",
    level: group.level ?? "",
    teacher_id: group.teacher_id ? String(group.teacher_id) : "",
    lesson_days: group.lesson_days ?? "",
    lesson_time: group.lesson_time ?? "",
    room: group.room ?? "",
    monthly_fee: group.monthly_fee ? String(Number(group.monthly_fee)) : "",
    start_date: group.start_date ?? "",
    end_date: group.end_date ?? "",
    is_active: group.is_active,
  };
}

export default function Groups() {
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [form, setForm] = useState<GroupFormState>(emptyGroupForm);
  const [formErrors, setFormErrors] = useState<GroupFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyGroupId, setBusyGroupId] = useState<number | null>(null);

  const groups = useAsyncData(
    () =>
      getGroups({
        q: search.trim() || undefined,
        limit: 500,
      }),
    [search]
  );
  const teachers = useAsyncData(getTeachers, []);

  const groupsData = groups.data ?? [];
  const teachersData = teachers.data ?? [];
  const activeCount = groupsData.filter((group) => group.is_active).length;
  const courseCount = useMemo(
    () =>
      new Set(groupsData.map((group) => group.course_name?.trim()).filter(Boolean)).size,
    [groupsData]
  );

  function openCreateDrawer() {
    setEditing(null);
    setForm(emptyGroupForm);
    setFormErrors({});
    setFormError(null);
    setSuccess(null);
    setDrawerOpen(true);
  }

  function openEditDrawer(group: Group) {
    setEditing(group);
    setForm(formFromGroup(group));
    setFormErrors({});
    setFormError(null);
    setSuccess(null);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditing(null);
    setFormErrors({});
  }

  function validateForm() {
    const errors: GroupFormErrors = {};
    if (form.name.trim().length < 2) errors.name = "Guruh nomini kiriting.";
    if (form.monthly_fee && Number(form.monthly_fee) <= 0)
      errors.monthly_fee = "Oylik to'lov 0 dan katta bo'lishi kerak.";
    if (form.start_date && form.end_date && form.start_date > form.end_date)
      errors.end_date = "Tugash sanasi boshlanish sanasidan keyin bo'lishi kerak.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function buildPayload(): GroupPayload {
    return {
      name: form.name.trim(),
      course_name: form.course_name.trim() || null,
      level: form.level.trim() || null,
      teacher_id: form.teacher_id ? Number(form.teacher_id) : null,
      lesson_days: form.lesson_days.trim() || null,
      lesson_time: form.lesson_time || null,
      room: form.room.trim() || null,
      monthly_fee: form.monthly_fee ? String(Number(form.monthly_fee)) : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      is_active: form.is_active,
    };
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);
    if (!validateForm()) return;

    setSaving(true);
    try {
      if (editing) {
        await updateGroup(editing.id, buildPayload());
        setSuccess("Guruh ma'lumotlari yangilandi.");
      } else {
        await createGroup(buildPayload());
        setSuccess("Yangi guruh yaratildi.");
      }
      closeDrawer();
      await groups.reload();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(group: Group) {
    const confirmed = window.confirm(
      `${group.name} guruhini o'chirasizmi? Studentlar guruhsiz qoladi.`
    );
    if (!confirmed) return;

    setFormError(null);
    setSuccess(null);
    setBusyGroupId(group.id);
    try {
      await deleteGroup(group.id);
      setSuccess("Guruh o'chirildi.");
      await groups.reload();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setBusyGroupId(null);
    }
  }

  if (groups.loading && !groups.data) return <LoadingState />;
  if (groups.error) return <ErrorState message={groups.error} />;
  if (teachers.error) return <ErrorState message={teachers.error} />;

  return (
    <div className="min-h-screen bg-white p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 text-slate-900">
      {/* Premium Header - Blue-Purple to Cyan Gradient */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A2A6C] via-[#1A3A8A] to-[#2193b0] p-6 md:p-8 text-white shadow-xl shadow-cyan-500/10">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gradient-to-br from-cyan-400/20 to-transparent blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-gradient-to-tr from-blue-400/20 to-transparent blur-3xl" />

        <div className="relative space-y-6 lg:grid lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-8 lg:space-y-0">
          <div>
            <span className="inline-flex rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-cyan-100 backdrop-blur-sm ring-1 ring-white/10">
              Groups Management
            </span>
            <h2 className="mt-4 text-3xl md:text-3xl font-semibold tracking-tight">
              Manage Your Groups
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/70">
              Create groups, assign teachers, and manage student journals efficiently
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/20 bg-white/5 p-5 backdrop-blur-sm ring-1 ring-white/10 transition-all hover:bg-white/10">
              <Users className="text-cyan-200" size={24} />
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-cyan-100">
                Total Groups
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{groupsData.length}</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/5 p-5 backdrop-blur-sm ring-1 ring-white/10 transition-all hover:bg-white/10">
              <CheckCircle2 className="text-emerald-200" size={24} />
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-cyan-100">
                Active Groups
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{activeCount}</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/5 p-5 backdrop-blur-sm ring-1 ring-white/10 transition-all hover:bg-white/10">
              <GraduationCap className="text-cyan-200" size={24} />
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-cyan-100">
                Courses
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{courseCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/70 backdrop-blur-sm md:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-cyan-300 ring-1 ring-cyan-400/30">
              Group Actions
            </span>
            <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">
              Add & Edit Groups
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              Create groups based on courses, assign teachers and set fees
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-11 text-sm text-slate-900 shadow-inner outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search groups..."
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={openCreateDrawer}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-cyan-500/20 transition-all hover:from-cyan-600 hover:to-blue-600 hover:shadow-cyan-500/30"
            >
              <Plus size={18} />
              Create Group
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Messages */}
      {formError && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 backdrop-blur-sm">
          <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm font-medium">{formError}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700 backdrop-blur-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      {/* Groups List */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-slate-900">
              Groups List
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              All groups and their details
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
              {groupsData.length} groups
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              {activeCount} active
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/70">
          {groups.loading ? (
            <div className="p-12">
              <LoadingState />
            </div>
          ) : groupsData.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <Users className="mb-4 h-14 w-14 text-slate-300" />
              <p className="text-base font-semibold text-slate-900">
                No groups found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Create a new group or adjust your search
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {groupsData.map((group) => (
                <article
                  key={group.id}
                  className="grid gap-5 p-5 transition-colors hover:bg-slate-50 md:p-6 lg:grid-cols-[1fr_0.45fr] lg:items-center"
                >
                  <div className="flex items-start gap-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-lg font-semibold text-white shadow-md shadow-cyan-500/20">
                      {groupInitial(group)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-semibold tracking-tight text-slate-900">
                          {group.name}
                        </h4>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                            group.is_active
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                              : "bg-slate-100 text-slate-500 ring-slate-200"
                          }`}
                        >
                          {group.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                        {group.course_name && (
                          <span className="inline-flex items-center gap-1.5">
                            <GraduationCap size={14} className="text-slate-400" />
                            {group.course_name}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5">
                          <Users size={14} className="text-slate-400" />
                          Teacher: {teacherName(group, teachersData)}
                        </span>
                        {group.room && (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin size={14} className="text-slate-400" />
                            Room: {group.room}
                          </span>
                        )}
                        {(group.lesson_days || group.lesson_time) && (
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays size={14} className="text-slate-400" />
                            {[group.lesson_days, group.lesson_time]
                              .filter(Boolean)
                              .join(" / ")}
                          </span>
                        )}
                      </div>

                      <NavLink
                        to={`/admin/groups/${group.id}`}
                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-cyan-600 transition-colors hover:text-cyan-700"
                      >
                        View details
                        <span className="text-lg leading-none">в†’</span>
                      </NavLink>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                          <span className="rounded-lg bg-cyan-500/20 p-1.5 text-cyan-300">
                            <Users size={16} />
                          </span>
                          Students
                        </span>
                        <span className="text-xl font-semibold tabular-nums text-slate-900">
                          {group.students_count}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                          <span className="rounded-lg bg-amber-500/20 p-1.5 text-amber-300">
                            <CircleDollarSign size={16} />
                          </span>
                          Monthly Fee
                        </span>
                        <span className="text-base font-semibold tabular-nums text-slate-900">
                          {formatMoney(group.monthly_fee)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                      <NavLink
                        to={`/admin/groups/${group.id}`}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700"
                      >
                        <BookOpen size={16} />
                        Journal
                      </NavLink>
                      <button
                        type="button"
                        onClick={() => openEditDrawer(group)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700"
                        aria-label="Edit group"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(group)}
                        disabled={busyGroupId === group.id}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Delete group"
                      >
                        {busyGroupId === group.id ? (
                          <span className="block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Trash2 size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Premium Drawer (Modal) */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-sm transition-all"
          onClick={closeDrawer}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="group-drawer-title"
            className="ml-auto flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header - Gradient */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1A2A6C] via-[#1A3A8A] to-[#2193b0] px-6 py-6 text-white">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                    {editing ? <Pencil size={20} /> : <Plus size={20} />}
                  </span>
                  <div>
                    <h3 id="group-drawer-title" className="text-xl font-semibold tracking-tight">
                      {editing ? "Edit Group" : "Create New Group"}
                    </h3>
                    <p className="mt-1 text-sm text-white/70">
                      Enter course, teacher, room and fee details
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="rounded-full p-2 text-white/70 transition-all hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Drawer Form */}
            <form onSubmit={handleSubmit} className="flex-1 space-y-5 overflow-y-auto p-6">
              <div className="space-y-1.5">
                <label htmlFor="group-name" className="text-xs font-medium uppercase tracking-wide text-slate-600">
                  Group Name *
                </label>
                <input
                  id="group-name"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="e.g. Backend Development"
                />
                {formErrors.name && (
                  <p className="text-xs font-medium text-red-400">{formErrors.name}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="group-course" className="text-xs font-medium uppercase tracking-wide text-slate-600">
                    Course Name
                  </label>
                  <input
                    id="group-course"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
                    value={form.course_name}
                    onChange={(event) => setForm({ ...form, course_name: event.target.value })}
                    placeholder="Programming Fundamentals"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="group-level" className="text-xs font-medium uppercase tracking-wide text-slate-600">
                    Level
                  </label>
                  <input
                    id="group-level"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
                    value={form.level}
                    onChange={(event) => setForm({ ...form, level: event.target.value })}
                    placeholder="Beginner, Intermediate"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="group-teacher" className="text-xs font-medium uppercase tracking-wide text-slate-600">
                    Teacher
                  </label>
                  <select
                    id="group-teacher"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all hover:border-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-60"
                    value={form.teacher_id}
                    onChange={(event) => setForm({ ...form, teacher_id: event.target.value })}
                    disabled={teachers.loading}
                  >
                    <option value="">No teacher assigned</option>
                    {teachersData.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="group-room" className="text-xs font-medium uppercase tracking-wide text-slate-600">
                    Room
                  </label>
                  <input
                    id="group-room"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
                    value={form.room}
                    onChange={(event) => setForm({ ...form, room: event.target.value })}
                    placeholder="Room 705"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="group-days" className="text-xs font-medium uppercase tracking-wide text-slate-600">
                    Lesson Days
                  </label>
                  <input
                    id="group-days"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
                    value={form.lesson_days}
                    onChange={(event) => setForm({ ...form, lesson_days: event.target.value })}
                    placeholder="Mon/Wed/Fri"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="group-time" className="text-xs font-medium uppercase tracking-wide text-slate-600">
                    Lesson Time
                  </label>
                  <input
                    id="group-time"
                    type="time"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all hover:border-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
                    value={form.lesson_time}
                    onChange={(event) => setForm({ ...form, lesson_time: event.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="group-start" className="text-xs font-medium uppercase tracking-wide text-slate-600">
                    Start Date
                  </label>
                  <input
                    id="group-start"
                    type="date"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all hover:border-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
                    value={form.start_date}
                    onChange={(event) => setForm({ ...form, start_date: event.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="group-end" className="text-xs font-medium uppercase tracking-wide text-slate-600">
                    End Date
                  </label>
                  <input
                    id="group-end"
                    type="date"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all hover:border-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
                    value={form.end_date}
                    onChange={(event) => setForm({ ...form, end_date: event.target.value })}
                  />
                  {formErrors.end_date && (
                    <p className="text-xs font-medium text-red-400">{formErrors.end_date}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="group-monthly-fee" className="text-xs font-medium uppercase tracking-wide text-slate-600">
                  Monthly Fee
                </label>
                <input
                  id="group-monthly-fee"
                  type="number"
                  min="0"
                  step="1000"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
                  value={form.monthly_fee}
                  onChange={(event) => setForm({ ...form, monthly_fee: event.target.value })}
                  placeholder="1800000"
                />
                {formErrors.monthly_fee && (
                  <p className="text-xs font-medium text-red-400">{formErrors.monthly_fee}</p>
                )}
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-all hover:border-slate-300">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 bg-white text-cyan-500 transition-all focus:ring-2 focus:ring-cyan-400/30"
                />
                Active Group
              </label>

              <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-700">
                <span className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-600" />
                  After creating a group, you can add months in the journal page to manage lessons.
                </span>
              </div>

              <div className="sticky bottom-0 -mx-6 flex gap-3 border-t border-slate-200 bg-white/95 px-6 py-5 backdrop-blur-sm">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-cyan-500/20 transition-all hover:from-cyan-600 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editing
                    ? "Update Group"
                    : "Create Group"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm(editing ? formFromGroup(editing) : emptyGroupForm);
                    setFormErrors({});
                  }}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reset
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}

