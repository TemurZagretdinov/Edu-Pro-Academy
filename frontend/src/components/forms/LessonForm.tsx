import { useState } from "react";

import { Button } from "../ui/Button";
import type { Group, LessonTime } from "../../types";

type LessonFormProps = {
  groups: Group[];
  onSubmit: (payload: Omit<LessonTime, "id">) => Promise<void>;
};

export function LessonForm({ groups, onSubmit }: LessonFormProps) {
  const [form, setForm] = useState<Omit<LessonTime, "id">>({
    title: "",
    datetime: "",
    group_id: null,
    time_id: null,
    is_accepted: false,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    await onSubmit({
      ...form,
      group_id: form.group_id ? Number(form.group_id) : null,
      datetime: new Date(form.datetime).toISOString(),
    });
    setSaving(false);
    setForm({ title: "", datetime: "", group_id: null, time_id: null, is_accepted: false });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-4">
      <label className="space-y-1">
        <span className="label">Lesson title</span>
        <input className="field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      </label>
      <label className="space-y-1">
        <span className="label">Group</span>
        <select className="field" value={form.group_id ?? ""} onChange={(e) => setForm({ ...form, group_id: e.target.value ? Number(e.target.value) : null })}>
          <option value="">No group</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="label">Date and time</span>
        <input
          className="field"
          type="datetime-local"
          value={form.datetime}
          onChange={(e) => setForm({ ...form, datetime: e.target.value })}
          required
        />
      </label>
      <div className="pt-5">
        <Button disabled={saving}>{saving ? "Saving..." : "Create lesson"}</Button>
      </div>
    </form>
  );
}
