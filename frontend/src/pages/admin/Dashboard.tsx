import type { ReactNode } from "react";
import {
  ArrowRight,
  Bell,
  ChevronRight,
  CreditCard,
  DollarSign,
  GraduationCap,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import { getDashboardStats } from "../../api/dashboard";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { useAsyncData } from "../../hooks/useAsyncData";

/* ====== Utility ====== */
function formatCurrency(amount: number | string) {
  const num = typeof amount === "number" ? amount : Number(amount);
  return new Intl.NumberFormat("uz-UZ", {
    style: "currency",
    currency: "UZS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(num) ? num : 0);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("uz-UZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ====== Dashboard (asosiy kontent) ====== */
export default function Dashboard() {
  const { data, loading, error } = useAsyncData(getDashboardStats, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50">
      <main className="space-y-8">
        {/* ===== HEADER ===== */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
              Salom, Admin
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Bugun, {formatDate(new Date().toISOString())}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative rounded-full bg-white p-2.5 shadow-sm hover:bg-slate-50 transition">
              <Bell size={18} className="text-slate-500" />
              <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 ring-2 ring-white shadow-sm" />
          </div>
        </header>

        {/* ===== STATISTIKA KARTALARI ===== */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Jami o'quvchilar"
            value={data.total_students}
            change={+22}
            icon={<GraduationCap size={20} />}
            tone="emerald"
          />
          <StatCard
            title="Faol guruhlar"
            value={`${data.active_groups}/${data.total_groups}`}
            change={+36}
            icon={<Users size={20} />}
            tone="sky"
          />
          <StatCard
            title="Oylik tushum"
            value={formatCurrency(data.total_monthly_revenue)}
            change={+11}
            icon={<DollarSign size={20} />}
            tone="violet"
            compact
          />
          <StatCard
            title="Qarzdor o'quvchilar"
            value={data.overdue_students}
            change={-8}
            icon={<CreditCard size={20} />}
            tone="rose"
          />
        </div>

        {/* ===== DIAGRAMMA (FAOLLIK) ===== */}
        <section className="rounded-3xl border border-white/40 bg-white/70 backdrop-blur-lg p-6 shadow-xl shadow-slate-200/20">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              Oylik daromad dinamikasi
            </h3>
            <div className="flex gap-1 rounded-xl bg-slate-100/70 p-1">
              {["Yan", "Fev", "Mar", "Apr", "May", "Iyun"].map((m, idx) => (
                <button
                  key={m}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    idx === 5
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <ActivityChart />
        </section>

        {/* ===== SO'NGGI TO'LOVLAR + HOLAT ===== */}
        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          {/* To'lovlar jadvali */}
          <div className="rounded-3xl border border-white/40 bg-white/70 backdrop-blur-lg p-6 shadow-xl shadow-slate-200/20">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                So'nggi to'lovlar
              </h3>
              <Link
                to="/admin/payments"
                className="group flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-700"
              >
                Hammasi
                <ArrowRight size={15} />
              </Link>
            </div>
            <ul className="-my-2 divide-y divide-slate-100">
              {data.recent_payments.slice(0, 4).map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between py-3 px-2 -mx-2 rounded-xl hover:bg-sky-50/40 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-sky-100 text-violet-700">
                      <CreditCard size={16} />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        Student #{p.student_id}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(p.payment_date)}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-medium tabular-nums text-slate-900">
                    {formatCurrency(p.amount)}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* To'lov holati */}
          <div className="rounded-3xl border border-white/40 bg-white/70 backdrop-blur-lg p-6 shadow-xl shadow-slate-200/20">
            <h3 className="text-lg font-semibold text-slate-900">
              To'lov holati
            </h3>
            <div className="mt-6 space-y-5">
              <ProgressItem
                label="Vaqtida to'lovlar"
                value={data.paid_on_time_students}
                total={data.total_active_students}
                color="bg-emerald-500"
                icon={<CheckCircle2 size={16} />}
              />
              <ProgressItem
                label="Qarzdorlar"
                value={data.overdue_students}
                total={data.total_active_students}
                color="bg-rose-500"
                icon={<Clock size={16} />}
              />
              <div className="pt-2 border-t border-slate-100 flex justify-between text-sm">
                <span className="text-slate-500">Jami faol</span>
                <span className="font-semibold text-slate-900">
                  {data.total_active_students}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== TEZKOR AMALLAR ===== */}
        <div className="grid gap-4 sm:grid-cols-3">
          <QuickAction
            to="/admin/students"
            icon={<GraduationCap size={20} />}
            title="O'quvchilar"
            desc="Ro'yxat, qidirish va guruhlarga biriktirish"
            gradient="from-emerald-500 to-cyan-500"
          />
          <QuickAction
            to="/admin/teachers"
            icon={<Users size={20} />}
            title="O'qituvchilar"
            desc="Mentorlar, ularning guruhlari"
            gradient="from-sky-500 to-blue-500"
          />
          <QuickAction
            to="/admin/payments"
            icon={<DollarSign size={20} />}
            title="To'lovlar"
            desc="Kirimlar, qarzdorlik nazorati"
            gradient="from-violet-500 to-purple-500"
          />
        </div>
      </main>
    </div>
  );
}

/* ==================== Yordamchi komponentlar ==================== */

function StatCard({
  title,
  value,
  change,
  icon,
  tone,
  compact = false,
}: {
  title: string;
  value: ReactNode;
  change: number;
  icon: ReactNode;
  tone: "emerald" | "sky" | "violet" | "rose";
  compact?: boolean;
}) {
  const colorMap = {
    emerald: "text-emerald-600 bg-emerald-50 ring-emerald-200",
    sky: "text-sky-600 bg-sky-50 ring-sky-200",
    violet: "text-violet-600 bg-violet-50 ring-violet-200",
    rose: "text-rose-600 bg-rose-50 ring-rose-200",
  };

  return (
    <div className="group rounded-3xl border border-white/40 bg-white/70 backdrop-blur-lg p-5 shadow-xl shadow-slate-200/20 transition-all hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p
            className={`mt-2 font-semibold tabular-nums tracking-tight text-slate-900 ${
              compact ? "text-2xl" : "text-3xl"
            }`}
          >
            {value}
          </p>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ${colorMap[tone]}`}>
          {icon}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-sm">
        <span className={`font-semibold ${change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
          {change > 0 ? "+" : ""}{change}%
        </span>
        <span className="text-slate-400">o'tgan oyga</span>
      </div>
    </div>
  );
}

function ProgressItem({
  label,
  value,
  total,
  color,
  icon,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  icon: ReactNode;
}) {
  const percent = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-medium text-slate-700">
          <span className="text-slate-400">{icon}</span> {label}
        </span>
        <span className="font-semibold text-slate-900">{value}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function QuickAction({
  to,
  icon,
  title,
  desc,
  gradient,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  desc: string;
  gradient: string;
}) {
  return (
    <Link
      to={to}
      className="group relative rounded-3xl border border-white/40 bg-white/70 backdrop-blur-lg p-5 shadow-xl shadow-slate-200/20 transition-all hover:-translate-y-0.5"
    >
      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-sm`}>
        {icon}
      </span>
      <h4 className="mt-4 text-base font-semibold text-slate-900">{title}</h4>
      <p className="mt-1 text-sm text-slate-500">{desc}</p>
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800">
        Kirish
        <ChevronRight size={14} />
      </span>
    </Link>
  );
}

/* ====== Oddiy SVG diagramma ====== */
function ActivityChart() {
  const values = [32, 45, 28, 60, 72, 58];
  const maxVal = Math.max(...values, 1);
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${100 - (v / maxVal) * 80}`)
    .join(" ");

  return (
    <div className="h-48 w-full">
      <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <polyline
          points={points}
          fill="none"
          stroke="url(#lg)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {values.map((v, i) => (
          <circle
            key={i}
            cx={(i / (values.length - 1)) * 100}
            cy={100 - (v / maxVal) * 80}
            r="1.5"
            fill="white"
            stroke="#6366f1"
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-xs font-medium text-slate-400">
        {["Yan", "Fev", "Mar", "Apr", "May", "Iyun"].map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  );
}

/* Qo'shimcha ikona */
function CheckCircle2({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function Clock({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}


