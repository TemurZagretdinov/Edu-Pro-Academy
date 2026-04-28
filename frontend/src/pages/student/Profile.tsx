import { useState } from "react";
import { Phone, Mail, Users, Calendar, MapPin, LockKeyhole } from "lucide-react";
import { changePassword } from "../../api/auth";
import { getErrorMessage } from "../../api/client";
import { Button } from "../../components/ui/Button";
import { getStudentProfile } from "../../api/studentPortal";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { useAsyncData } from "../../hooks/useAsyncData";

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("uz-UZ") : "-";
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function StudentProfile() {
  const { data, loading, error } = useAsyncData(getStudentProfile, []);
  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  if (loading) return <LoadingState />;
  if (error)   return <ErrorState message={error} />;
  if (!data)   return null;

  const cells = [
    { icon: <Phone size={14} />, iconBg: "bg-emerald-50",  iconColor: "text-emerald-700", label: "Telefon",        value: data.phone_number,          note: `Ota-ona: ${data.parent_phone_number ?? "-"}` },
    { icon: <Mail size={14} />,  iconBg: "bg-rose-50",     iconColor: "text-rose-700",    label: "Email",          value: data.email ?? "-",          note: null },
    { icon: <Users size={14} />, iconBg: "bg-violet-50",   iconColor: "text-violet-700",  label: "Guruh",          value: data.group_name ?? "Guruhsiz", note: `O'qituvchi: ${data.teacher_name ?? "-"}` },
    { icon: <Calendar size={14} />, iconBg: "bg-amber-50", iconColor: "text-amber-700",   label: "Tug'ilgan sana", value: formatDate(data.birth_date), note: `Jinsi: ${data.gender ?? "-"}` },
    { icon: <MapPin size={14} />,   iconBg: "bg-emerald-50", iconColor: "text-emerald-700", label: "Manzil",       value: data.address ?? "-",        note: null, wide: true },
  ];

  async function handleChangePassword(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);
    if (form.new_password.length < 8) {
      setFormError("Yangi parol kamida 8 ta belgidan iborat bo'lishi kerak.");
      return;
    }
    if (form.new_password !== form.confirm_password) {
      setFormError("Yangi parollar mos emas.");
      return;
    }
    setSaving(true);
    try {
      const response = await changePassword({
        current_password: form.current_password,
        new_password: form.new_password,
      });
      setSuccess(response.message);
      setForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="min-h-screen bg-stone-50 p-7 font-sans">
      <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">

        {/* Top hero row */}
        <div className="flex items-start gap-4 p-6 border-b border-stone-100">
          <div className="w-16 h-16 rounded-[18px] bg-stone-100 flex items-center justify-center font-semibold text-xl text-stone-600 flex-shrink-0" style={{ fontFamily: "Syne, sans-serif" }}>
            {getInitials(data.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-stone-400 mb-1.5">Mening profilim</p>
            <h2 className="font-semibold text-2xl tracking-tight text-stone-950 leading-tight truncate">
              {data.full_name}
            </h2>
            <p className="text-sm text-stone-400 mt-1">
              {[data.group_name, data.teacher_name].filter(Boolean).join(" / ")}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium flex-shrink-0 ${
            data.is_active ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${data.is_active ? "bg-emerald-500" : "bg-red-500"}`} />
            {data.is_active ? "Faol" : "Nofaol"}
          </span>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 divide-x divide-y divide-stone-100">
          {cells.map(({ icon, iconBg, iconColor, label, value, note, wide }) => (
            <div
              key={label}
              className={`p-5 hover:bg-stone-50 transition-colors ${wide ? "col-span-2 md:col-span-3" : ""}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg} ${iconColor}`}>
                  {icon}
                </div>
                <span className="text-[10px] uppercase tracking-wide text-stone-400">{label}</span>
              </div>
              <p className="font-medium text-sm text-stone-900 leading-snug">{value}</p>
              {note && <p className="text-xs text-stone-400 mt-1">{note}</p>}
            </div>
          ))}
        </div>

      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-stone-100 p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
            <LockKeyhole size={18} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-stone-900">Parolni o'zgartirish</h3>
            <p className="text-sm text-stone-500">Student panelga kirgandan keyin parolni yangilab oling.</p>
          </div>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4 p-6">
          {formError && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{formError}</div>}
          {success && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{success}</div>}
          <div className="grid gap-4 md:grid-cols-3">
            <Field
              label="Joriy parol"
              value={form.current_password}
              onChange={(value) => setForm((current) => ({ ...current, current_password: value }))}
            />
            <Field
              label="Yangi parol"
              value={form.new_password}
              onChange={(value) => setForm((current) => ({ ...current, new_password: value }))}
            />
            <Field
              label="Yangi parolni tasdiqlang"
              value={form.confirm_password}
              onChange={(value) => setForm((current) => ({ ...current, confirm_password: value }))}
            />
          </div>
          <Button disabled={saving} className="min-w-[220px]">
            {saving ? "Saqlanmoqda..." : "Parolni yangilash"}
          </Button>
        </form>
      </div>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-stone-700">{label}</span>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
      />
    </label>
  );
}

