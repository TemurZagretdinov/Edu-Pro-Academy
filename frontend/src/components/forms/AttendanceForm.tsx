import { useState } from "react";

import { Button } from "../ui/Button";
import type { AttendancePayload, AttendanceStatus, LessonTime, Student } from "../../types";

type AttendanceFormProps = {
  students: Student[];
  lessons: LessonTime[];
  onSubmit: (payload: AttendancePayload) => Promise<void>;
};

export function AttendanceForm({ students, lessons, onSubmit }: AttendanceFormProps) {
  const [form, setForm] = useState<AttendancePayload>({ student_id: 0, lesson_id: 0, group_id: null, teacher_id: null, date: null, status: "came", reason: null, note: null });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    await onSubmit({ ...form, student_id: Number(form.student_id), lesson_id: Number(form.lesson_id) });
    setSaving(false);
    setForm({ student_id: 0, lesson_id: 0, group_id: null, teacher_id: null, date: null, status: "came", reason: null, note: null });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-5">
      <label className="space-y-1">
        <span className="label">Student</span>
        <select className="field" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: Number(e.target.value) })} required>
          <option value={0}>Select</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.firstname} {student.lastname}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="label">Lesson</span>
        <select className="field" value={form.lesson_id ?? 0} onChange={(e) => setForm({ ...form, lesson_id: Number(e.target.value) })} required>
          <option value={0}>Select</option>
          {lessons.map((lesson) => (
            <option key={lesson.id} value={lesson.id}>
              {lesson.title}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="label">Status</span>
        <select className="field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AttendanceStatus })}>
          <option value="came">Came</option>
          <option value="absent">Absent</option>
          <option value="late">Late</option>
          <option value="excused">Excused</option>
        </select>
      </label>
      <label className="space-y-1">
        <span className="label">Reason / vazifa</span>
        <input className="field" value={form.reason ?? ""} onChange={(e) => setForm({ ...form, reason: e.target.value || null })} />
      </label>
      <div className="pt-5">
        <Button disabled={saving || !form.student_id || !form.lesson_id}>{saving ? "Saving..." : "Mark"}</Button>
      </div>
    </form>
  );
}
