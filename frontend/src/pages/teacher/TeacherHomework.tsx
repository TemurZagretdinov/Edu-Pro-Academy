import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { BookCopy, BookOpen, CheckCircle2, ClipboardList, CopyPlus, ListChecks, Save, Sparkles, type LucideIcon } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import { getErrorMessage } from "../../api/client";
import {
  createMyHomework,
  getMyGroups,
  getMyHomework,
  getMyHomeworkStatuses,
  getMyStudents,
  markMyHomeworkStatus,
} from "../../api/teacherPanel";
import { Button } from "../../components/ui/Button";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { useAsyncData } from "../../hooks/useAsyncData";
import type { Homework } from "../../types";
import { groupNameFromMap, teacherStudentName } from "../../utils/teacherPanel";

type HomeworkTab = "assign" | "status" | "list";

type HomeworkFormState = {
  title: string;
  description: string;
  group_id: number;
  due_date: string;
};

const TEMPLATE_STORAGE_KEY = "teacher-homework-template";

function emptyForm(groupId = 0): HomeworkFormState {
  return {
    title: "",
    description: "",
    group_id: groupId,
    due_date: "",
  };
}

function readStoredTemplate(): HomeworkFormState | null {
  try {
    const raw = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HomeworkFormState) : null;
  } catch {
    return null;
  }
}

export default function TeacherHomework() {
  const [searchParams, setSearchParams] = useSearchParams();
  const groups = useAsyncData(getMyGroups, []);
  const students = useAsyncData(() => getMyStudents({ include_inactive: true }), []);
  const homework = useAsyncData(getMyHomework, []);
  const homeworkStatuses = useAsyncData(getMyHomeworkStatuses, []);

  const initialGroupId = Number(searchParams.get("groupId") ?? 0);
  const initialTab = (searchParams.get("tab") as HomeworkTab | null) ?? "assign";
  const storedTemplate = readStoredTemplate();

  const [activeTab, setActiveTab] = useState<HomeworkTab>(initialTab);
  const [form, setForm] = useState<HomeworkFormState>(storedTemplate ?? emptyForm(initialGroupId));
  const [statusForm, setStatusForm] = useState({ homework_id: 0, student_id: 0, is_completed: true, note: "" });
  const [listGroupFilter, setListGroupFilter] = useState(initialGroupId);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const groupsData = groups.data ?? [];
  const homeworkData = homework.data ?? [];
  const statusesData = homeworkStatuses.data ?? [];
  const studentsData = students.data ?? [];

  useEffect(() => {
    if (!form.group_id && groupsData.length > 0) {
      setForm((current) => ({ ...current, group_id: initialGroupId || groupsData[0].id }));
    }
  }, [form.group_id, groupsData, initialGroupId]);

  useEffect(() => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set("tab", activeTab);
        return next;
      },
      { replace: true },
    );
  }, [activeTab, setSearchParams]);

  const groupsById = useMemo(() => new Map(groupsData.map((group) => [group.id, group])), [groupsData]);
  const selectedHomework = homeworkData.find((item) => item.id === statusForm.homework_id) ?? null;
  const studentsForSelectedHomework = selectedHomework
    ? studentsData.filter((student) => student.group_id === selectedHomework.group_id)
    : [];
  const selectedGroupName = form.group_id ? groupNameFromMap(form.group_id, groupsById) : "Guruh tanlanmagan";

  const completionByHomeworkId = useMemo(() => {
    const map = new Map<number, { total: number; completed: number }>();
    for (const row of statusesData) {
      const current = map.get(row.homework_id) ?? { total: 0, completed: 0 };
      current.total += 1;
      if (row.is_completed) current.completed += 1;
      map.set(row.homework_id, current);
    }
    return map;
  }, [statusesData]);

  const filteredHomework = useMemo(
    () => homeworkData.filter((item) => !listGroupFilter || item.group_id === listGroupFilter),
    [homeworkData, listGroupFilter],
  );

  async function handleCreateHomework(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await createMyHomework({
        title: form.title,
        description: form.description.trim() || null,
        group_id: form.group_id,
        due_date: form.due_date || null,
        is_active: true,
      });
      setSuccess("Yangi vazifa yaratildi.");
      setForm((current) => ({ ...emptyForm(current.group_id), group_id: current.group_id }));
      await homework.reload();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleMarkStatus(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await markMyHomeworkStatus({
        homework_id: statusForm.homework_id,
        student_id: statusForm.student_id,
        is_completed: statusForm.is_completed,
        submitted_at: null,
        note: statusForm.note.trim() || null,
      });
      setSuccess("Vazifa holati yangilandi.");
      setStatusForm((current) => ({ ...current, student_id: 0, note: "" }));
      await homeworkStatuses.reload();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function copyHomeworkIntoForm(item: Homework) {
    setError(null);
    setSuccess("Vazifa formaga nusxa qilindi.");
    setForm({
      title: item.title,
      description: item.description ?? "",
      group_id: item.group_id,
      due_date: item.due_date ?? "",
    });
    setActiveTab("assign");
  }

  function saveTemplate() {
    setError(null);
    setSavingTemplate(true);
    try {
      window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(form));
      setSuccess("Vazifa shabloni saqlandi.");
    } finally {
      setSavingTemplate(false);
    }
  }

  function loadTemplate() {
    const template = readStoredTemplate();
    if (!template) {
      setError("Saqlangan shablon topilmadi.");
      return;
    }
    setError(null);
    setForm(template);
    setActiveTab("assign");
    setSuccess("Shablon formaga yuklandi.");
  }

  function clearForm() {
    setForm(emptyForm(form.group_id));
  }

  if (groups.loading || students.loading || homework.loading || homeworkStatuses.loading) return <LoadingState />;
  if (groups.error || students.error || homework.error || homeworkStatuses.error) {
    return <ErrorState message={groups.error ?? students.error ?? homework.error ?? homeworkStatuses.error ?? "Xatolik"} />;
  }

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-4 text-white">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                <ClipboardList size={13} />
                Vazifalar
              </div>
              <h2 className="mt-2 text-2xl font-bold">Vazifalar boshqaruvi</h2>
              <p className="mt-1 text-sm text-amber-100">
                Vazifa berish, holatini belgilash va eski topshiriqlardan tez nusxa olish uchun ixcham ish maydoni.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <StatsPill label="Jami" value={homeworkData.length} />
              <StatsPill label="Faol" value={homeworkData.filter((item) => item.is_active).length} />
              <StatsPill label="Guruhlar" value={groupsData.length} />
            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-4 py-3">
          <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-1">
            <TabButton active={activeTab === "assign"} onClick={() => setActiveTab("assign")} icon={BookOpen} label="Vazifa berish" />
            <TabButton active={activeTab === "status"} onClick={() => setActiveTab("status")} icon={CheckCircle2} label="Holat belgilash" />
            <TabButton active={activeTab === "list"} onClick={() => setActiveTab("list")} icon={ListChecks} label="Ro'yxat" />
          </div>
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

      {activeTab === "assign" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Yangi vazifa</h3>
                <p className="text-sm text-slate-500">Bir qatorda asosiy maydonlar, pastda esa faqat kerakli amallar.</p>
              </div>

              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                <Sparkles size={13} />
                <span className="truncate">{selectedGroupName}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleCreateHomework} className="space-y-4 p-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_260px]">
              <Field label="Vazifa nomi">
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                  placeholder="Masalan: Array mashqlari"
                  required
                />
              </Field>

              <Field label="Guruh">
                <select
                  value={form.group_id}
                  onChange={(event) => setForm((current) => ({ ...current, group_id: Number(event.target.value) }))}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                  required
                >
                  <option value={0}>Guruh tanlang</option>
                  {groupsData.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
              <Field label="Tavsif">
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  className="min-h-[104px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                  placeholder="Topshiriq tafsilotlari"
                />
              </Field>

              <Field label="Muddat">
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(event) => setForm((current) => ({ ...current, due_date: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                />
              </Field>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                <SecondaryAction onClick={loadTemplate} icon={BookCopy} label="Shablonni yuklash" />
                <SecondaryAction onClick={saveTemplate} icon={Save} label={savingTemplate ? "Saqlanmoqda..." : "Shablon saqlash"} />
                <TertiaryAction onClick={clearForm} label="Tozalash" />
              </div>

              <Button
                type="submit"
                disabled={!form.title.trim() || !form.group_id}
                className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-2.5 text-white shadow-lg shadow-orange-500/20"
              >
                <Save size={15} />
                Vazifani yuborish
              </Button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "status" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-lg font-semibold text-slate-900">Vazifa holatini belgilash</h3>
            <p className="text-sm text-slate-500">Avval vazifa, keyin talaba va oxirida natija.</p>
          </div>

          <form onSubmit={handleMarkStatus} className="space-y-4 p-5">
            <div className="grid gap-3 lg:grid-cols-2">
              <Field label="Vazifa">
                <select
                  value={statusForm.homework_id}
                  onChange={(event) =>
                    setStatusForm({
                      homework_id: Number(event.target.value),
                      student_id: 0,
                      is_completed: true,
                      note: "",
                    })
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                  required
                >
                  <option value={0}>Vazifa tanlang</option>
                  {homeworkData.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} ({groupNameFromMap(item.group_id, groupsById)})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Talaba">
                <select
                  value={statusForm.student_id}
                  onChange={(event) => setStatusForm((current) => ({ ...current, student_id: Number(event.target.value) }))}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                  required
                  disabled={!selectedHomework}
                >
                  <option value={0}>{selectedHomework ? "Talaba tanlang" : "Avval vazifani tanlang"}</option>
                  {studentsForSelectedHomework.map((student) => (
                    <option key={student.id} value={student.id}>
                      {teacherStudentName(student)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_auto]">
              <Field label="Holat">
                <select
                  value={String(statusForm.is_completed)}
                  onChange={(event) => setStatusForm((current) => ({ ...current, is_completed: event.target.value === "true" }))}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                >
                  <option value="true">Bajardi</option>
                  <option value="false">Bajarmadi</option>
                </select>
              </Field>

              <Field label="Izoh">
                <input
                  value={statusForm.note}
                  onChange={(event) => setStatusForm((current) => ({ ...current, note: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                  placeholder="Qo'shimcha izoh"
                />
              </Field>

              <div className="lg:self-end">
                <Button type="submit" disabled={!statusForm.homework_id || !statusForm.student_id} className="px-5 py-2.5 text-sm">
                  <CheckCircle2 size={15} />
                  Holatni saqlash
                </Button>
              </div>
            </div>

            {selectedHomework && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-800">{selectedHomework.title}</span> •{" "}
                {groupNameFromMap(selectedHomework.group_id, groupsById)} • {studentsForSelectedHomework.length} ta talaba
              </div>
            )}
          </form>
        </div>
      )}

      {activeTab === "list" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Vazifalar ro'yxati</h3>
                <p className="text-sm text-slate-500">Guruh filtri, nusxa olish va statusga tez o'tish bilan.</p>
              </div>

              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                <span>Guruh filtri</span>
                <select
                  value={listGroupFilter}
                  onChange={(event) => setListGroupFilter(Number(event.target.value))}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                >
                  <option value={0}>Barcha guruhlar</option>
                  {groupsData.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="space-y-3 p-5">
            {filteredHomework.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                <ClipboardList className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                <p className="font-semibold text-slate-700">Vazifa topilmadi</p>
                <p className="mt-1 text-sm text-slate-500">
                  {listGroupFilter ? "Tanlangan guruh uchun vazifa yo'q." : "Birinchi vazifani yuqoridagi tab orqali yarating."}
                </p>
              </div>
            ) : (
              filteredHomework.map((item) => {
                const completion = completionByHomeworkId.get(item.id);
                const percent = completion?.total ? Math.round((completion.completed / completion.total) * 100) : null;

                return (
                  <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            {groupNameFromMap(item.group_id, groupsById)}
                          </span>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              item.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {item.is_active ? "Faol" : "Yopilgan"}
                          </span>
                        </div>
                        <h4 className="mt-2 text-base font-bold text-slate-900">{item.title}</h4>
                        {item.description && <p className="mt-1 text-sm text-slate-600">{item.description}</p>}
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>{item.due_date ? `Muddat: ${item.due_date}` : "Muddat ko'rsatilmagan"}</span>
                          <span>
                            {percent === null
                              ? "Status hali belgilanmagan"
                              : `${completion?.completed ?? 0}/${completion?.total ?? 0} bajarilgan (${percent}%)`}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <SecondaryAction onClick={() => copyHomeworkIntoForm(item)} icon={CopyPlus} label="Nusxa olish" />
                        <button
                          type="button"
                          onClick={() => {
                            setStatusForm((current) => ({ ...current, homework_id: item.id, student_id: 0 }));
                            setActiveTab("status");
                          }}
                          className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          <CheckCircle2 size={15} />
                          Holat belgilash
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

function SecondaryAction({
  onClick,
  icon: Icon,
  label,
}: {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

function TertiaryAction({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
    >
      {label}
    </button>
  );
}

function StatsPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/10 px-3.5 py-2.5 backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-100">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-white">{value}</p>
    </div>
  );
}
