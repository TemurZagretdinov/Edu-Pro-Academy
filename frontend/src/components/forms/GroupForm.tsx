import { useEffect, useState } from "react";

import { Button } from "../ui/Button";
import type { Group, GroupPayload, Teacher } from "../../types";

const emptyForm: GroupPayload = {
  name: "",
  course_name: "",
  level: "",
  start_date: null,
  end_date: null,
  lesson_days: "",
  lesson_time: null,
  teacher_id: null,
  is_active: true,
};

type GroupFormProps = {
  teachers?: Teacher[];
  editing?: Group | null;
  onSubmit: (payload: GroupPayload) => Promise<void>;
  onCancel?: () => void;
};

export function GroupForm({ teachers = [], editing, onSubmit, onCancel }: GroupFormProps) {
  const [form, setForm] = useState<GroupPayload>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(
      editing
        ? {
            name: editing.name,
            course_name: editing.course_name ?? "",
            level: editing.level ?? "",
            start_date: editing.start_date ?? null,
            end_date: editing.end_date ?? null,
            lesson_days: editing.lesson_days ?? "",
            lesson_time: editing.lesson_time ?? null,
            teacher_id: editing.teacher_id ?? null,
            is_active: editing.is_active,
          }
        : emptyForm,
    );
  }, [editing]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit(form);
      if (!editing) setForm(emptyForm);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-3">
      <label className="space-y-1">
        <span className="label">Guruh nomi</span>
        <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </label>
      <label className="space-y-1">
        <span className="label">Kurs nomi</span>
        <input className="field" value={form.course_name ?? ""} onChange={(e) => setForm({ ...form, course_name: e.target.value })} />
      </label>
      <label className="space-y-1">
        <span className="label">Daraja</span>
        <input className="field" value={form.level ?? ""} onChange={(e) => setForm({ ...form, level: e.target.value })} />
      </label>
      <label className="space-y-1">
        <span className="label">Boshlanish sanasi</span>
        <input className="field" type="date" value={form.start_date ?? ""} onChange={(e) => setForm({ ...form, start_date: e.target.value || null })} />
      </label>
      <label className="space-y-1">
        <span className="label">Tugash sanasi</span>
        <input className="field" type="date" value={form.end_date ?? ""} onChange={(e) => setForm({ ...form, end_date: e.target.value || null })} />
      </label>
      <label className="space-y-1">
        <span className="label">Dars kunlari</span>
        <input className="field" value={form.lesson_days ?? ""} onChange={(e) => setForm({ ...form, lesson_days: e.target.value })} placeholder="Du/Chor/Juma" />
      </label>
      <label className="space-y-1">
        <span className="label">Dars vaqti</span>
        <input className="field" type="time" value={form.lesson_time ?? ""} onChange={(e) => setForm({ ...form, lesson_time: e.target.value || null })} />
      </label>
      <label className="space-y-1">
        <span className="label">O'qituvchi</span>
        <select className="field" value={form.teacher_id ?? ""} onChange={(e) => setForm({ ...form, teacher_id: e.target.value ? Number(e.target.value) : null })}>
          <option value="">Tanlanmagan</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 pt-6 text-sm font-medium text-slate-600">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
        />
        Faol
      </label>
      <div className="flex gap-2 pt-5 md:col-span-3">
        <Button disabled={saving}>{saving ? "Saqlanmoqda..." : editing ? "Guruhni yangilash" : "Guruh yaratish"}</Button>
        {editing && onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Bekor qilish
          </Button>
        )}
      </div>
    </form>
  );
}
