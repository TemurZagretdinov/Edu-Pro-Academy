import { useState } from "react";
import { ArrowLeft, Phone, ShieldAlert } from "lucide-react";
import { NavLink, useParams } from "react-router-dom";

import { getErrorMessage } from "../../api/client";
import { getStudentProgress, notifyMyStudentParent } from "../../api/teacherPanel";
import { TeacherRiskBadge } from "../../components/teacher/TeacherRiskBadge";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { useAsyncData } from "../../hooks/useAsyncData";
import { resolveTeacherRisk, teacherStudentName } from "../../utils/teacherPanel";

function todayDate() {
  const value = new Date();
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 10);
}

export default function StudentProgress() {
  const { id } = useParams();
  const studentId = Number(id);
  const progress = useAsyncData(() => getStudentProgress(studentId), [studentId]);
  const [notifyError, setNotifyError] = useState<string | null>(null);
  const [notifySuccess, setNotifySuccess] = useState<string | null>(null);
  const [notifyingType, setNotifyingType] = useState<"absent" | "late" | null>(null);

  async function sendParentNotification(type: "absent" | "late") {
    if (!progress.data) return;
    setNotifyError(null);
    setNotifySuccess(null);
    setNotifyingType(type);
    try {
      const result = await notifyMyStudentParent(progress.data.student.id, {
        type,
        date: todayDate(),
      });
      setNotifySuccess(
        result.sent_count > 0
          ? "Ota-onaga bildirishnoma yuborildi."
          : "Bog'langan ota-ona topilmadi, shuning uchun yuborilmadi.",
      );
    } catch (error) {
      setNotifyError(getErrorMessage(error));
    } finally {
      setNotifyingType(null);
    }
  }

  if (!Number.isFinite(studentId)) return <ErrorState message="Talaba ID noto'g'ri." />;
  if (progress.loading) return <LoadingState />;
  if (progress.error) return <ErrorState message={progress.error} />;
  if (!progress.data) return null;

  const { student, attendance_percent, homework_percent, attendance_total, homework_total, recent_notes, can_notify_parent } = progress.data;
  const riskLevel = resolveTeacherRisk(attendance_percent, homework_percent);

  return (
    <section className="space-y-6">
      <NavLink to="/teacher/students" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900">
        <ArrowLeft size={16} />
        Talabalar sahifasiga qaytish
      </NavLink>

      <div className="rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-700 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <ShieldAlert size={14} />
              Talaba progressi
            </div>
            <h2 className="text-3xl font-bold">{teacherStudentName(student)}</h2>
            <p className="mt-2 text-sm text-sky-100">Telefon: {student.phone_number}</p>
          </div>

          <TeacherRiskBadge level={riskLevel} />
        </div>
      </div>

      {notifyError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {notifyError}
        </div>
      )}
      {notifySuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {notifySuccess}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Davomat foizi" value={`${attendance_percent}%`} detail={`${attendance_total} ta yozuv`} />
        <MetricCard label="Vazifa foizi" value={`${homework_percent}%`} detail={`${homework_total} ta vazifa`} />
        <MetricCard label="Ota-ona telefoni" value={student.parent_phone_number ?? "Kiritilmagan"} detail="Tezkor bog'lanish" />
        <MetricCard label="Holat" value={student.is_active ? "Faol" : "Nofaol"} detail="Joriy status" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">Tezkor amallar</h3>
          <p className="text-sm text-slate-500">Sodda va kerakli harakatlar</p>
        </div>

        <div className="flex flex-wrap gap-3 p-6">
          <NavLink
            to="/teacher/students"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft size={15} />
            Talabalarga qaytish
          </NavLink>

          {student.parent_phone_number && (
            <a
              href={`tel:${student.parent_phone_number}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Phone size={15} />
              Ota-onaga qo'ng'iroq
            </a>
          )}

          {can_notify_parent && (
            <>
              <button
                type="button"
                onClick={() => void sendParentNotification("absent")}
                disabled={notifyingType !== null}
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
              >
                {notifyingType === "absent" ? "Yuborilmoqda..." : "Kelmadi deb yuborish"}
              </button>
              <button
                type="button"
                onClick={() => void sendParentNotification("late")}
                disabled={notifyingType !== null}
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
              >
                {notifyingType === "late" ? "Yuborilmoqda..." : "Kechikdi deb yuborish"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-900">Ko'rsatkichlar</h3>
            <p className="text-sm text-slate-500">Davomat va vazifa bo'yicha umumiy ko'rinish</p>
          </div>

          <div className="space-y-5 p-6">
            <ProgressBar label="Davomat" value={attendance_percent} accent="bg-sky-600" />
            <ProgressBar label="Vazifa bajarilishi" value={homework_percent} accent="bg-emerald-600" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-900">So'nggi izohlar</h3>
            <p className="text-sm text-slate-500">Davomat, vazifa yoki umumiy eslatmalar</p>
          </div>

          <div className="space-y-3 p-6">
            {recent_notes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                Hozircha izoh yoki eslatma topilmadi.
              </div>
            ) : (
              recent_notes.map((item, index) => (
                <div key={`${item.title}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-800">{item.title}</p>
                    <span className="text-xs text-slate-400">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString("uz-UZ") : "-"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{item.note}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-100 p-3 text-amber-700">
            <ShieldAlert size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Risk tavsifi</p>
            <p className="text-sm text-slate-500">
              {riskLevel === "good"
                ? "Davomat va vazifa ko'rsatkichlari yaxshi."
                : riskLevel === "medium"
                  ? "Ko'rsatkichlar o'rtacha, nazoratni davom ettiring."
                  : "Talaba bilan va kerak bo'lsa ota-ona bilan aloqani kuchaytirish tavsiya etiladi."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </div>
  );
}

function ProgressBar({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all ${accent}`} style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
      </div>
    </div>
  );
}
