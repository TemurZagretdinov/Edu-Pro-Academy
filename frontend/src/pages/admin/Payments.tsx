import { useState, useMemo } from "react";
import {
  CreditCard,
  Wallet,
  DollarSign,
  TrendingUp,
  Calendar,
  Banknote,
  Landmark,
  Plus,
  ArrowRight,
} from "lucide-react";

import { getErrorMessage } from "../../api/client";
import { createPayment, getPayments } from "../../api/payments";
import { getStudents } from "../../api/students";
import { PaymentForm } from "../../components/forms/PaymentForm";
import { DataTable, type Column } from "../../components/tables/DataTable";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { useAsyncData } from "../../hooks/useAsyncData";
import type { Payment, PaymentPayload } from "../../types";

export default function Payments() {
  const payments = useAsyncData(getPayments, []);
  const students = useAsyncData(getStudents, []);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(payload: PaymentPayload) {
    setFormError(null);
    setSuccess(null);
    try {
      await createPayment(payload);
      setSuccess("To'lov muvaffaqiyatli qo'shildi.");
      await payments.reload();
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  }

  const studentNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const student of students.data ?? []) {
      map.set(student.id, `${student.firstname} ${student.lastname}`);
    }
    return map;
  }, [students.data]);

  const paymentData = payments.data ?? [];
  const totalPayments = paymentData.length;
  const totalAmount = paymentData.reduce((sum, p) => sum + Number(p.amount), 0);
  const cashPayments = paymentData.filter((p) => p.is_cash);
  const cardPayments = paymentData.filter((p) => !p.is_cash);
  const totalCash = cashPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalCard = cardPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  const columns: Column<Payment>[] = [
    {
      header: "Talaba",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 text-sm font-medium text-white shadow-sm shadow-emerald-500/20 ring-1 ring-white/10">
            {studentNameById.get(row.student_id)?.[0] || "#"}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">
              {studentNameById.get(row.student_id) || `Student #${row.student_id}`}
            </p>
            <p className="text-xs text-slate-500">ID: {row.student_id}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Summa",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <DollarSign size={14} className="text-slate-400" />
          <span className="text-sm font-medium tabular-nums text-slate-900">
            {Number(row.amount).toLocaleString()} UZS
          </span>
        </div>
      ),
    },
    {
      header: "To'lov turi",
      cell: (row) => (
        <div
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium shadow-sm ring-1 ${
            row.is_cash
              ? "bg-amber-50 text-amber-700 ring-amber-200/60"
              : "bg-purple-50 text-purple-700 ring-purple-200/60"
          }`}
        >
          {row.is_cash ? (
            <>
              <Banknote size={12} />
              Naqd
            </>
          ) : (
            <>
              <Landmark size={12} />
              Plastik / O'tkazma
            </>
          )}
        </div>
      ),
    },
    {
      header: "Yaratilgan",
      cell: (row) => (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Calendar size={14} className="text-slate-400" />
          {new Date(row.created_at).toLocaleString("uz-UZ")}
        </div>
      ),
    },
  ];

  if (payments.loading || students.loading) return <LoadingState />;
  if (payments.error) return <ErrorState message={payments.error} />;
  if (students.error) return <ErrorState message={students.error} />;

  return (
    <div className="min-h-screen space-y-8 bg-gradient-to-br from-slate-50 via-white to-sky-50">
      <section className="rounded-3xl border border-white/40 bg-gradient-to-r from-emerald-600 via-cyan-700 to-cyan-800 p-8 text-white shadow-xl shadow-emerald-900/15">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15">
                <CreditCard size={22} className="text-emerald-100" />
              </div>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium uppercase tracking-wide text-emerald-50 ring-1 ring-white/10">
                To'lovlar paneli
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-3xl">
                To'lovlar
              </h1>
              <p className="mt-2 max-w-xl text-base text-emerald-50/85">
                Naqd va plastik to'lovlarni qayd eting va kuzating
              </p>
            </div>
          </div>
          <div className="w-full max-w-[180px] rounded-3xl border border-white/10 bg-white/10 p-5 text-center backdrop-blur-sm">
            <div className="text-3xl font-semibold tabular-nums">{totalPayments}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wide text-emerald-50/90">
                Jami to'lovlar
            </div>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Jami to'lovlar"
          value={totalPayments}
          icon={<CreditCard size={20} />}
          color="slate"
        />
        <StatCard
          title="Jami summa"
          value={`${totalAmount.toLocaleString()} UZS`}
          icon={<Wallet size={20} />}
          color="emerald"
        />
        <StatCard
          title="Naqd to'lovlar"
          value={`${totalCash.toLocaleString()} UZS`}
          icon={<Banknote size={20} />}
          color="amber"
        />
        <StatCard
          title="Plastik / O'tkazma"
          value={`${totalCard.toLocaleString()} UZS`}
          icon={<Landmark size={20} />}
          color="purple"
        />
      </div>

      {/* Feedback Messages */}
      {formError && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-5 text-rose-800 shadow-sm backdrop-blur-sm">
          <div className="mt-0.5 h-4 w-4 shrink-0 text-rose-500">вњ•</div>
          <p className="text-sm font-medium">{formError}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-emerald-800 shadow-sm backdrop-blur-sm">
          <div className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500">вњ“</div>
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      {/* Payment Form Card */}
      <div className="overflow-hidden rounded-3xl border border-white/40 bg-white/80 shadow-xl shadow-slate-200/20 backdrop-blur-lg">
        <div className="border-b border-slate-200/70 bg-white/70 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-2 ring-1 ring-emerald-200/60">
              <Plus size={18} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Yangi to'lov qo'shish
              </h3>
              <p className="text-sm text-slate-500">
                Talaba va summa ma'lumotlarini kiriting
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <PaymentForm students={students.data ?? []} onSubmit={handleSubmit} />
        </div>
      </div>

      {/* Payments Table */}
      <div className="overflow-hidden rounded-3xl border border-white/40 bg-white/80 shadow-xl shadow-slate-200/20 backdrop-blur-lg">
        <div className="flex items-center justify-between border-b border-slate-200/70 bg-white/70 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-100 p-2 ring-1 ring-slate-200/60">
              <TrendingUp size={18} className="text-slate-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                To'lovlar tarixi
              </h3>
              <p className="text-sm text-slate-500">
                Barcha qayd etilgan to'lovlar ro'yxati
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <CreditCard size={14} />
            <span>Jami {totalPayments} ta to'lov</span>
          </div>
        </div>
        <DataTable
          data={paymentData}
          columns={columns}
          emptyLabel={
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <CreditCard className="mb-4 h-14 w-14 text-slate-300" />
              <p className="text-base font-semibold text-slate-700">
                Hech qanday to'lov topilmadi
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Yuqoridagi forma orqali birinchi to'lovni qo'shing
              </p>
            </div>
          }
          className="[&_table]:min-w-full [&_th]:px-6 [&_th]:py-3.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-slate-500 [&_td]:px-6 [&_td]:py-4 [&_td]:text-sm [&_tr]:border-b [&_tr]:border-slate-100 [&_tr:last-child]:border-0 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-slate-50/80"
        />
      </div>
    </div>
  );
}

/* Helper Component */
function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: "slate" | "emerald" | "amber" | "purple";
}) {
  const colorClasses = {
    slate: "bg-slate-50 text-slate-700 ring-slate-200/60",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
    amber: "bg-amber-50 text-amber-700 ring-amber-200/60",
    purple: "bg-purple-50 text-purple-700 ring-purple-200/60",
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/30">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <div
          className={`rounded-xl p-2.5 ring-1 transition-all duration-300 group-hover:scale-105 ${colorClasses[color]}`}
        >
          {icon}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}


