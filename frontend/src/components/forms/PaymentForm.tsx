import { useState } from "react";

import { Button } from "../ui/Button";
import type { PaymentPayload, Student } from "../../types";

type PaymentFormProps = {
  students: Student[];
  onSubmit: (payload: PaymentPayload) => Promise<void>;
};

export function PaymentForm({ students, onSubmit }: PaymentFormProps) {
  const [form, setForm] = useState<PaymentPayload>({ student_id: 0, amount: 0, is_cash: true, time_id: null, paid_for_month: null, status: "paid", note: null });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    await onSubmit({ ...form, student_id: Number(form.student_id), amount: Number(form.amount) });
    setSaving(false);
    setForm({ student_id: 0, amount: 0, is_cash: true, time_id: null, paid_for_month: null, status: "paid", note: null });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-5">
      <label className="space-y-1">
        <span className="label">Student</span>
        <select className="field" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: Number(e.target.value) })} required>
          <option value={0}>Select student</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.firstname} {student.lastname}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="label">Amount</span>
        <input
          className="field"
          type="number"
          min={1}
          value={form.amount || ""}
          onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
          required
        />
      </label>
      <label className="flex items-center gap-2 pt-6 text-sm font-medium text-slate-600">
        <input type="checkbox" checked={form.is_cash} onChange={(e) => setForm({ ...form, is_cash: e.target.checked })} />
        Cash payment
      </label>
      <label className="space-y-1">
        <span className="label">Month</span>
        <input className="field" type="date" value={form.paid_for_month ?? ""} onChange={(e) => setForm({ ...form, paid_for_month: e.target.value || null })} />
      </label>
      <label className="space-y-1">
        <span className="label">Status</span>
        <select className="field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="paid">To'langan</option>
          <option value="late">Kechikkan</option>
          <option value="partial">Qisman</option>
        </select>
      </label>
      <div className="pt-5">
        <Button disabled={saving || !form.student_id}>{saving ? "Saving..." : "Create payment"}</Button>
      </div>
    </form>
  );
}
