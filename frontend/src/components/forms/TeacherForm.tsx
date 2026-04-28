import { useEffect, useState } from "react";

import { Button } from "../ui/Button";
import type { Teacher, TeacherPayload } from "../../types";

const emptyForm: TeacherPayload = { name: "", email: "", phone_number: "", password: "" };

type TeacherFormProps = {
  editing?: Teacher | null;
  onSubmit: (payload: TeacherPayload) => Promise<void>;
  onCancel?: () => void;
};

export function TeacherForm({ editing, onSubmit, onCancel }: TeacherFormProps) {
  const [form, setForm] = useState<TeacherPayload>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(editing ? { name: editing.name, email: editing.email, phone_number: editing.phone_number, password: "" } : emptyForm);
  }, [editing]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    await onSubmit({ ...form, password: form.password || null });
    setSaving(false);
    if (!editing) setForm(emptyForm);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-4">
      <label className="space-y-1">
        <span className="label">Name</span>
        <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </label>
      <label className="space-y-1">
        <span className="label">Email</span>
        <input className="field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      </label>
      <label className="space-y-1">
        <span className="label">Phone</span>
        <input className="field" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} required />
      </label>
      <label className="space-y-1">
        <span className="label">Login password</span>
        <input className="field" type="password" value={form.password ?? ""} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editing ? "Leave empty" : "Teacher login"} />
      </label>
      <div className="flex gap-2 md:col-span-4">
        <Button disabled={saving}>{saving ? "Saving..." : editing ? "Update teacher" : "Create teacher"}</Button>
        {editing && onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
