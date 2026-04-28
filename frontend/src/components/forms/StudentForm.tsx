import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import type { Student, StudentPayload } from "../../types";

const DEFAULT_STUDENT_PASSWORD = "12345678";

const emptyForm: StudentPayload = {
  firstname: "",
  lastname: "",
  phone_number: "",
  parent_phone_number: "",
  email: null,
  birth_date: null,
  gender: null,
  address: "",
  group_id: null,
  teacher_id: null,
  registration_date: new Date().toISOString().slice(0, 10),
  is_active: true,
  comment: "",
  trial_lesson_status: "new",
  passport: null,
};

type StudentFormProps = {
  editing?: Student | null;
  onSubmit: (payload: StudentPayload) => Promise<void>;
  onCancel?: () => void;
};

export function StudentForm({ editing, onSubmit, onCancel }: StudentFormProps) {
  const [form, setForm] = useState<StudentPayload>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        firstname: editing.firstname,
        lastname: editing.lastname,
        phone_number: editing.phone_number,
        parent_phone_number: editing.parent_phone_number ?? "",
        email: editing.email,
        birth_date: editing.birth_date ?? null,
        gender: editing.gender ?? null,
        address: editing.address ?? "",
        group_id: editing.group_id,
        teacher_id: editing.teacher_id ?? null,
        registration_date: editing.registration_date ?? null,
        is_active: editing.is_active,
        comment: editing.comment ?? "",
        trial_lesson_status: editing.trial_lesson_status ?? "new",
        passport: editing.passport
          ? {
              firstname: editing.passport.firstname,
              lastname: editing.passport.lastname,
              seria: editing.passport.seria,
              jshir: editing.passport.jshir,
              passport_number: editing.passport.passport_number,
              issued_by: editing.passport.issued_by,
              notes: editing.passport.notes,
            }
          : null,
      });
    } else {
      setForm(emptyForm);
    }
  }, [editing]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        email: form.email || null,
        parent_phone_number: form.parent_phone_number || null,
        birth_date: form.birth_date || null,
        gender: form.gender || null,
        address: form.address || null,
        comment: form.comment || null,
        group_id: form.group_id ?? null,
        teacher_id: form.teacher_id ?? null,
        passport: null,
      });
      if (!editing) setForm(emptyForm);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-semibold text-slate-900">
          {editing ? "Talabani tahrirlash" : "Yangi talaba qo'shish"}
        </h2>
        <p className="mt-1 text-sm font-normal text-slate-500">
          {editing 
            ? "Talaba ma'lumotlarini o'zgartiring" 
            : "Quyidagi formani to'ldirib, yangi talaba qo'shing"}
        </p>
        {!editing && (
          <p className="mt-2 text-sm font-normal text-blue-600">
            Default parol: {DEFAULT_STUDENT_PASSWORD}. O'quvchi login qilgandan keyin parolini o'zgartirishi mumkin.
          </p>
        )}
      </div>

      {/* Form Fields */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Ism */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-600">
            Ism <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.firstname}
            onChange={(e) => setForm({ ...form, firstname: e.target.value })}
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-normal text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            placeholder="Ismni kiriting"
          />
        </div>

        {/* Familiya */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-600">
            Familiya <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.lastname}
            onChange={(e) => setForm({ ...form, lastname: e.target.value })}
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-normal text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            placeholder="Familiyani kiriting"
          />
        </div>

        {/* Telefon */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-600">
            Telefon raqam <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={form.phone_number}
            onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-normal text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            placeholder="+998 90 123 45 67"
          />
        </div>

        {/* Ota-ona telefoni */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-600">
            Ota-ona telefon raqami
          </label>
          <input
            type="tel"
            value={form.parent_phone_number ?? ""}
            onChange={(e) => setForm({ ...form, parent_phone_number: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-normal text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            placeholder="+998 90 123 45 67"
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-600">
            Elektron pochta
          </label>
          <input
            type="email"
            value={form.email ?? ""}
            onChange={(e) => setForm({ ...form, email: e.target.value || null })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-normal text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            placeholder="example@email.com"
          />
        </div>

        {/* Tug'ilgan sana */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-600">
            Tug'ilgan sana
          </label>
          <input
            type="date"
            value={form.birth_date ?? ""}
            onChange={(e) => setForm({ ...form, birth_date: e.target.value || null })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-normal text-slate-800 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
          />
        </div>

        {/* Jinsi */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-600">
            Jinsi
          </label>
          <select
            value={form.gender ?? ""}
            onChange={(e) => setForm({ ...form, gender: e.target.value || null })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-normal text-slate-800 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
          >
            <option value="">Tanlanmagan</option>
            <option value="male">Erkak</option>
            <option value="female">Ayol</option>
          </select>
        </div>

        {/* Manzil */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-600">
            Manzil
          </label>
          <input
            type="text"
            value={form.address ?? ""}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-normal text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            placeholder="Yashash manzili"
          />
        </div>

        {/* Ariza holati */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-600">
            Ariza holati
          </label>
          <select
            value={form.trial_lesson_status ?? "new"}
            onChange={(e) => setForm({ ...form, trial_lesson_status: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-normal text-slate-800 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
          >
            <option value="new">🆕 Yangi</option>
            <option value="trial_booked">📅 Sinov belgilangan</option>
            <option value="joined">✅ O'qishga qo'shildi</option>
          </select>
        </div>

        {/* Faol talaba */}
        <div className="flex items-center space-x-3 pt-6">
          <input
            type="checkbox"
            id="is_active"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          />
          <label htmlFor="is_active" className="text-sm font-medium text-slate-600">
            Faol talaba
          </label>
        </div>
      </div>

      {/* Izoh - to'liq kenglik */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-600">
          Izoh
        </label>
        <textarea
          value={form.comment ?? ""}
          onChange={(e) => setForm({ ...form, comment: e.target.value })}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-normal text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
          placeholder="Qo'shimcha ma'lumotlar..."
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 border-t border-gray-200 pt-6">
        <Button
          disabled={saving}
          className="min-w-[140px] bg-blue-600 px-6 py-2.5 text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saqlanmoqda...
            </span>
          ) : editing ? (
            "Talabani yangilash"
          ) : (
            "Talaba qo'shish"
          )}
        </Button>
        
        {editing && onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="px-6 py-2.5 border border-gray-300 bg-white text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:border-gray-400"
          >
            Bekor qilish
          </Button>
        )}
      </div>
    </form>
  );
}
