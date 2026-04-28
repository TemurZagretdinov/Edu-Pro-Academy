import {
  ArrowLeft,
  Bell,
  Calendar,
  Check,
  Copy,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Users,
  User,
  CreditCard,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  MessageCircle,
  Award,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, useParams } from "react-router-dom";

import { getErrorMessage } from "../../api/client";
import { getGroups } from "../../api/groups";
import {
  generateParentCode,
  getParentLinkStatus,
  getStudentParents,
  sendTestNotification,
} from "../../api/parents";
import {
  getStudent,
  getStudentAttendance,
  getStudentPayments,
} from "../../api/students";
import { DataTable, type Column } from "../../components/tables/DataTable";
import { Button } from "../../components/ui/Button";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAsyncData } from "../../hooks/useAsyncData";
import type { Attendance, ParentStudentLink, Payment } from "../../types";

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("uz-UZ") : "-";
}

function formatDateTime(value?: string | null) {
  return value
    ? new Date(value).toLocaleString("uz-UZ", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "ko'rsatilmagan";
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uz-UZ", {
    style: "currency",
    currency: "UZS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function StudentDetail() {
  const { id } = useParams();
  const studentId = Number(id);
  const [parentCode, setParentCode] = useState<string | null>(null);
  const [parentActionError, setParentActionError] = useState<string | null>(null);
  const [feedbackAction, setFeedbackAction] = useState<"code" | "instruction" | "link" | "test" | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [parentBusy, setParentBusy] = useState(false);
  const [showParentDetails, setShowParentDetails] = useState(false);

  const student = useAsyncData(() => getStudent(studentId), [studentId]);
  const groups = useAsyncData(getGroups, []);
  const payments = useAsyncData(() => getStudentPayments(studentId), [studentId]);
  const attendance = useAsyncData(() => getStudentAttendance(studentId), [studentId]);
  const parents = useAsyncData(() => getStudentParents(studentId), [studentId]);
  const parentLinkStatus = useAsyncData(() => getParentLinkStatus(studentId), [studentId]);

  async function handleGenerateParentCode() {
    setParentBusy(true);
    setParentActionError(null);
    try {
      const response = await generateParentCode(studentId);
      setParentCode(response.code);
      setToastMessage("Yangi ulash kodi yaratildi вњ…");
      await parentLinkStatus.reload();
    } catch (err) {
      setParentActionError(getErrorMessage(err));
    } finally {
      setParentBusy(false);
    }
  }

  async function handleSendTestNotification() {
    setParentBusy(true);
    setParentActionError(null);
    try {
      await sendTestNotification(studentId);
      setToastMessage("Test xabar yuborildi вњ…");
      setFeedbackAction("test");
      await parents.reload();
      await parentLinkStatus.reload();
    } catch (err) {
      setParentActionError(getErrorMessage(err) || "Test xabar yuborilmadi. Telegram ulanishini tekshiring.");
    } finally {
      setParentBusy(false);
    }
  }

  async function handleCopyParentCode() {
    const code = parentCode ?? parentLinkStatus.data?.active_code?.code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setFeedbackAction("code");
    } catch {
      setParentActionError("Kodni avtomatik nusxalab bo'lmadi.");
    }
  }

  const botUsername = useMemo(
    () => (import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "").replace(/^@/, "").trim(),
    []
  );

  const botLink = useMemo(() => {
    const code = parentCode ?? parentLinkStatus.data?.active_code?.code;
    if (!botUsername) return null;
    return code ? `https://t.me/${botUsername}?start=${code}` : `https://t.me/${botUsername}`;
  }, [botUsername, parentCode, parentLinkStatus.data?.active_code?.code]);

  const parentInstruction = useMemo(() => {
    const code = parentCode ?? parentLinkStatus.data?.active_code?.code;
    if (!code) return null;

    if (botUsername) {
      return [
        "Assalomu alaykum!",
        "",
        "Farzandingizning davomat, baho, vazifa va bildirishnomalarini Telegram orqali kuzatishingiz mumkin.",
        "",
        `1. Botga kiring: @${botUsername}`,
        '2. "Ulash kodi" tugmasini bosing',
        `3. Ushbu kodni yuboring: ${code}`,
        "",
        "Shundan so'ng farzandingiz ma'lumotlari botda ko'rinadi.",
      ].join("\n");
    }

    return [
      "Assalomu alaykum!",
      "",
      "Farzandingizning davomat, baho, vazifa va bildirishnomalarini Telegram orqali kuzatishingiz mumkin.",
      "",
      "Telegram botga kiring va ulash kodini yuboring.",
      `Ulash kodi: ${code}`,
    ].join("\n");
  }, [botUsername, parentCode, parentLinkStatus.data?.active_code?.code]);

  async function handleCopyParentInstruction() {
    if (!parentInstruction) return;
    try {
      await navigator.clipboard.writeText(parentInstruction);
      setFeedbackAction("instruction");
    } catch {
      setParentActionError("Yo'riqnomani nusxalab bo'lmadi.");
    }
  }

  async function handleCopyBotLink() {
    if (!botLink) return;
    try {
      await navigator.clipboard.writeText(botLink);
      setFeedbackAction("link");
    } catch {
      setParentActionError("Bot havolasini nusxalab bo'lmadi.");
    }
  }

  useEffect(() => {
    if (!feedbackAction) return;
    const timeout = window.setTimeout(() => setFeedbackAction(null), 2000);
    return () => window.clearTimeout(timeout);
  }, [feedbackAction]);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  if (!studentId) return <ErrorState message="Student ID noto'g'ri." />;
  if (
    student.loading ||
    groups.loading ||
    payments.loading ||
    attendance.loading ||
    parents.loading
    || parentLinkStatus.loading
  )
    return <LoadingState />;
  if (student.error) return <ErrorState message={student.error} />;
  if (!student.data) return <ErrorState message="Student topilmadi." />;

  const group = groups.data?.find((item) => item.id === student.data?.group_id);
  const activeParentCode = parentCode ?? parentLinkStatus.data?.active_code?.code ?? null;
  const parentLinks = parents.data ?? [];
  const parentConnectedLinks = parentLinks.filter((link) => Boolean(link.parent?.is_connected));
  const parentConnected = Boolean(parentLinkStatus.data?.parent_connected);
  const connectedParentCount = parentConnectedLinks.length;

  const totalPaid = (payments.data ?? []).reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );
  const totalAttendance = (attendance.data ?? []).length;
  const attendedCount = (attendance.data ?? []).filter(
    (a) => a.status === "came"
  ).length;
  const attendanceRate =
    totalAttendance > 0 ? Math.round((attendedCount / totalAttendance) * 100) : 0;

  const paymentColumns: Column<Payment>[] = [
    {
      header: "Sana",
      cell: (row) => (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Calendar size={14} className="text-slate-400" />
          {row.payment_date
            ? new Date(row.payment_date).toLocaleDateString("uz-UZ")
            : "вЂ”"}
        </div>
      ),
    },
    {
      header: "Oy",
      cell: (row) => (
        <span className="text-sm text-slate-700">{row.paid_for_month ?? "вЂ”"}</span>
      ),
    },
    {
      header: "Summa",
      cell: (row) => (
        <span className="text-sm font-medium text-emerald-600">
          {formatCurrency(Number(row.amount))}
        </span>
      ),
    },
    {
      header: "Holat",
      cell: (row) => (
        <StatusBadge
          active={row.status === "paid"}
          trueLabel={
            <span className="flex items-center gap-1">
              <CheckCircle size={12} />
              To'langan
            </span>
          }
          falseLabel={
            <span className="flex items-center gap-1">
              <Clock size={12} />
              Kutilmoqda
            </span>
          }
        />
      ),
    },
  ];

  const attendanceColumns: Column<Attendance>[] = [
    {
      header: "Sana",
      cell: (row) => (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Calendar size={14} className="text-slate-400" />
          {row.date
            ? new Date(row.date).toLocaleDateString("uz-UZ")
            : new Date(row.created_at).toLocaleDateString("uz-UZ")}
        </div>
      ),
    },
    {
      header: "Guruh",
      cell: (row) => (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Users size={14} className="text-slate-400" />
          {row.group_id
            ? groups.data?.find((item) => item.id === row.group_id)?.name ??
              `#${row.group_id}`
            : "вЂ”"}
        </div>
      ),
    },
    {
      header: "Holat",
      cell: (row) => {
        const config: Record<
          string,
          { label: string; classes: string; icon: typeof CheckCircle }
        > = {
          came: {
            label: "Kelgan",
            classes: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
            icon: CheckCircle,
          },
          absent: {
            label: "Kelmagan",
            classes: "bg-rose-50 text-rose-700 ring-rose-200/60",
            icon: XCircle,
          },
          late: {
            label: "Kechikkan",
            classes: "bg-amber-50 text-amber-700 ring-amber-200/60",
            icon: Clock,
          },
        };
        const { label, classes, icon: Icon } =
          config[row.status] || config.absent;
        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium shadow-sm ring-1 ${classes}`}
          >
            <Icon size={12} />
            {label}
          </span>
        );
      },
    },
    {
      header: "Izoh",
      cell: (row) =>
        row.note ?? row.reason ? (
          <span className="text-sm text-slate-600">{row.note ?? row.reason}</span>
        ) : (
          <span className="text-sm text-slate-400">вЂ”</span>
        ),
    },
  ];

  const parentColumns: Column<ParentStudentLink>[] = [
    {
      header: "Ota-ona",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-xs font-medium text-white shadow-sm">
            {row.parent?.full_name?.[0] || row.parent_id.toString()[0]}
          </div>
          <span className="text-sm font-medium text-slate-900">
            {row.parent?.full_name ?? `#${row.parent_id}`}
          </span>
        </div>
      ),
    },
    {
      header: "Telefon",
      cell: (row) =>
        row.parent?.phone_number ? (
          <a
            href={`tel:${row.parent.phone_number}`}
            className="group flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-slate-900"
          >
            <Phone size={14} className="text-slate-400" />
            <span className="border-b border-dotted border-transparent group-hover:border-slate-300">
              {row.parent.phone_number}
            </span>
          </a>
        ) : (
          <span className="text-sm text-slate-400">вЂ”</span>
        ),
    },
    {
      header: "Aloqa turi",
      cell: (row) => (
        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200/60">
          {row.relation_type}
        </span>
      ),
    },
    {
      header: "Telegram",
      cell: (row) => (
        <StatusBadge
          active={Boolean(row.parent?.is_connected)}
          trueLabel={
            <span className="flex items-center gap-1">
              <MessageCircle size={12} />
              Ulangan
            </span>
          }
          falseLabel={
            <span className="flex items-center gap-1">
              <MessageCircle size={12} />
              Ulanmagan
            </span>
          }
        />
      ),
    },
    {
      header: "Asosiy",
      cell: (row) =>
        row.is_primary ? (
          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200/60">
            Ha
          </span>
        ) : (
          <span className="text-sm text-slate-400">Yo'q</span>
        ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Back navigation */}
      <NavLink
        to="/admin/students"
        className="group inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft
          size={16}
          className="transition-transform group-hover:-translate-x-0.5"
        />
        Talabalar ro'yxatiga qaytish
      </NavLink>

      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 text-white shadow-2xl shadow-indigo-900/20">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-gradient-to-br from-blue-300/20 to-transparent blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-64 w-64 rounded-full bg-gradient-to-tr from-purple-300/10 to-transparent blur-3xl" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur-sm ring-1 ring-white/10">
                <User size={22} className="text-blue-200" />
              </div>
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium uppercase tracking-wide text-blue-100 backdrop-blur-sm ring-1 ring-white/10">
                Talaba profili
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-3xl">
              {student.data.firstname} {student.data.lastname}
            </h1>
            <p className="text-base text-blue-50/80">ID: {student.data.id}</p>
          </div>
          <div>
            <StatusBadge
              active={student.data.is_active}
              trueLabel={
                <span className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                  Faol
                </span>
              }
              falseLabel={
                <span className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-slate-400" />
                  Nofaol
                </span>
              }
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Jami to'lovlar"
          value={formatCurrency(totalPaid)}
          icon={<CreditCard size={20} />}
          color="emerald"
        />
        <StatCard
          title="Davomat foizi"
          value={`${attendanceRate}%`}
          icon={<TrendingUp size={20} />}
          color="blue"
        />
        <StatCard
          title="Kelgan darslar"
          value={`${attendedCount} / ${totalAttendance}`}
          icon={<Award size={20} />}
          color="amber"
        />
        <StatCard
          title="Ulangan ota-onalar"
          value={(parents.data ?? []).length}
          icon={<Users size={20} />}
          color="purple"
        />
      </div>

      {/* Personal Info Card */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/20">
        <div className="border-b border-slate-200/80 bg-gradient-to-r from-slate-50/80 to-white px-6 py-5">
          <h3 className="text-base font-semibold text-slate-900">
            Shaxsiy ma'lumotlar
          </h3>
        </div>
        <div className="p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <InfoTile
              icon={<Phone size={18} className="text-emerald-600" />}
              label="Telefon"
              value={student.data.phone_number}
              secondary={`Ota-ona: ${student.data.parent_phone_number ?? "-"}`}
            />
            <InfoTile
              icon={<Mail size={18} className="text-coral-500" />}
              label="Email"
              value={student.data.email ?? "-"}
            />
            <InfoTile
              icon={<Users size={18} className="text-sky-600" />}
              label="Guruh"
              value={group?.name ?? "Guruhsiz"}
            />
            <InfoTile
              icon={<Calendar size={18} className="text-purple-600" />}
              label="Tug'ilgan sana"
              value={formatDate(student.data.birth_date)}
              secondary={`Jinsi: ${
                student.data.gender === "male"
                  ? "Erkak"
                  : student.data.gender === "female"
                  ? "Ayol"
                  : "-"
              }`}
            />
            <InfoTile
              icon={<MapPin size={18} className="text-rose-500" />}
              label="Manzil"
              value={student.data.address ?? "-"}
              className="md:col-span-2 lg:col-span-1"
            />
          </div>
          {student.data.comment && (
            <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Izoh
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {student.data.comment}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Parent Section */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/20">
        <div className="border-b border-slate-200/80 bg-gradient-to-r from-slate-50/80 to-white px-6 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Ota-ona Telegram ulanishi
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Ota-ona bot orqali farzandining davomat, baho, vazifa va bildirishnomalarini ko'radi.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 md:items-end">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void parentLinkStatus.reload()}
                  disabled={parentBusy}
                >
                  <RefreshCw size={16} className="mr-1.5" />
                  Statusni tekshirish
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handleSendTestNotification()}
                  disabled={parentBusy || connectedParentCount === 0}
                  title={connectedParentCount === 0 ? "Avval ota-onani Telegramga ulang." : undefined}
                >
                  <Bell size={16} className="mr-1.5" />
                  {feedbackAction === "test" ? "Yuborildi" : "Test yuborish"}
                </Button>
              </div>
              {connectedParentCount === 0 && (
                <p className="text-xs text-slate-500">
                  Test yuborish uchun avval ota-ona ulanishi kerak.
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="relative space-y-4 p-6">
          {toastMessage && (
            <div className="pointer-events-none absolute right-6 top-4 z-10 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-700 shadow-lg shadow-emerald-100">
              <Check size={14} />
              {toastMessage}
            </div>
          )}
          {parentActionError && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-800">
              <XCircle size={16} className="mt-0.5 shrink-0 text-rose-500" />
              <p className="text-sm font-medium">{parentActionError}</p>
            </div>
          )}
          <div className={`rounded-2xl border p-4 ${parentConnected ? "border-emerald-200 bg-emerald-50/70" : "border-rose-200 bg-rose-50/70"}`}>
            <p className="text-sm font-medium text-slate-900">
              {parentConnected ? "Telegram ulangan" : "Telegram ulanmagan"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {parentConnected
                ? "Ota-ona bot orqali bildirishnomalarni oladi."
                : "Ota-onaga ulash kodini yuboring. Ulangandan keyin ota-ona farzand ma'lumotlarini ko'ra oladi."}
            </p>
            {parentConnected && (
              <p className="mt-2 text-xs font-medium text-emerald-700">
                Ulangan ota-onalar: {connectedParentCount} ta
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-50/80 to-white p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Faol ulash kodi
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-[0.18em] text-slate-900">
                  {activeParentCode ?? "Kod yaratilmagan"}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Muddati: {formatDateTime(parentLinkStatus.data?.active_code?.expires_at)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 lg:max-w-md lg:justify-end">
                <Button
                  type="button"
                  onClick={() => void handleCopyParentCode()}
                  disabled={!activeParentCode}
                >
                  <Copy size={16} className="mr-1.5" />
                  {feedbackAction === "code" ? "Nusxalandi" : "Kodni nusxalash"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handleCopyParentInstruction()}
                  disabled={!parentInstruction}
                >
                  <MessageCircle size={16} className="mr-1.5" />
                  {feedbackAction === "instruction" ? "Nusxalandi" : "Yo'riqnomani nusxalash"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handleGenerateParentCode()}
                  disabled={parentBusy}
                >
                  <KeyRound size={16} className="mr-1.5" />
                  Yangi kod yaratish
                </Button>
                {botLink && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void handleCopyBotLink()}
                    >
                      <Copy size={16} className="mr-1.5" />
                      {feedbackAction === "link" ? "Nusxalandi" : "Havolani nusxalash"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => window.open(botLink, "_blank", "noopener,noreferrer")}
                    >
                      <ExternalLink size={16} className="mr-1.5" />
                      Bot havolasini ochish
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <h4 className="text-sm font-medium text-slate-900">
                  Ota-onaga yuboriladigan yo'riqnoma
                </h4>
                <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
                  {parentInstruction ? (
                    <>
                      <p>Assalomu alaykum!</p>
                      <p className="mt-3">
                        Farzandingizning davomat, baho, vazifa va bildirishnomalarini Telegram orqali kuzatishingiz mumkin.
                      </p>
                      <div className="mt-3 space-y-1">
                        <p>{botUsername ? `1. Botga kiring: @${botUsername}` : "1. Telegram botga kiring"}</p>
                        <p>2. "Ulash kodi" tugmasini bosing</p>
                        <p>3. Ushbu kodni yuboring: {activeParentCode}</p>
                      </div>
                      {botLink && (
                        <div className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-sky-700 ring-1 ring-sky-200/70">
                          <p className="text-xs font-medium uppercase tracking-wide">Tez ulash havolasi</p>
                          <p className="mt-1 break-all text-sm">{botLink}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-slate-500">
                      Avval ulash kodini yarating. Shundan keyin ota-onaga yuboriladigan tayyor yo'riqnoma shu yerda ko'rinadi.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handleCopyParentInstruction()}
                  disabled={!parentInstruction}
                >
                  <MessageCircle size={16} className="mr-1.5" />
                  {feedbackAction === "instruction" ? "Nusxalandi" : "Yo'riqnomani nusxalash"}
                </Button>
                {botLink && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => window.open(botLink, "_blank", "noopener,noreferrer")}
                  >
                    <ExternalLink size={16} className="mr-1.5" />
                    Tez ulash havolasi
                  </Button>
                )}
              </div>
            </div>
          </div>
          {parents.error ? (
            <ErrorState message={parents.error} />
          ) : parentLinks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                    <Users size={20} className="text-slate-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-900">
                      Hali ota-ona ulanmagan
                    </h4>
                    <p className="mt-1 text-sm text-slate-500">
                      Ota-ona ulash kodini botga yuborgandan keyin shu yerda ko'rinadi.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => void handleCopyParentCode()}
                    disabled={!activeParentCode}
                  >
                    <Copy size={16} className="mr-1.5" />
                    {feedbackAction === "code" ? "Nusxalandi" : "Kodni nusxalash"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void handleCopyParentInstruction()}
                    disabled={!parentInstruction}
                  >
                    <MessageCircle size={16} className="mr-1.5" />
                    {feedbackAction === "instruction" ? "Nusxalandi" : "Yo'riqnomani nusxalash"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <DataTable
              data={parentLinks}
              columns={[
                ...parentColumns,
                {
                  header: "Ulangan sana",
                  cell: (row) => (
                    <span className="text-sm text-slate-600">
                      {row.parent?.created_at ? formatDate(row.parent.created_at) : "ko'rsatilmagan"}
                    </span>
                  ),
                },
              ]}
            />
          )}
          {parentLinks.length > 0 && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowParentDetails((value) => !value)}
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
              >
                Batafsil
                <ChevronDown size={16} className={`transition ${showParentDetails ? "rotate-180" : ""}`} />
              </button>
              {showParentDetails && (
                <div className="mt-3 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  {parentLinks.map((link) => (
                    <div key={link.id} className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                      <p className="font-semibold text-slate-900">{link.parent?.full_name ?? `Parent #${link.parent_id}`}</p>
                      <p>Telegram user id: {link.parent?.telegram_user_id ?? "ko'rsatilmagan"}</p>
                      <p>Chat id: {link.parent?.telegram_chat_id ?? "ko'rsatilmagan"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payments Section */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/20">
        <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900">To'lovlar</h3>
            <p className="text-sm text-slate-500">Talaba to'lovlari tarixi</p>
          </div>
          <div className="rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200/60">
            Jami: {formatCurrency(totalPaid)}
          </div>
        </div>
        <div className="p-6">
          {payments.error ? (
            <ErrorState message={payments.error} />
          ) : (
            <DataTable
              data={payments.data ?? []}
              columns={paymentColumns}
              emptyLabel={
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CreditCard className="mb-3 h-12 w-12 text-slate-300" />
                  <p className="font-medium text-slate-700">To'lovlar yo'q</p>
                </div>
              }
            />
          )}
        </div>
      </div>

      {/* Attendance Section */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/20">
        <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Davomat</h3>
            <p className="text-sm text-slate-500">Darslarga qatnashish tarixi</p>
          </div>
          <div className="rounded-full bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 ring-1 ring-blue-200/60">
            {attendanceRate}% qatnashish
          </div>
        </div>
        <div className="p-6">
          {attendance.error ? (
            <ErrorState message={attendance.error} />
          ) : (
            <DataTable
              data={attendance.data ?? []}
              columns={attendanceColumns}
              emptyLabel={
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Calendar className="mb-3 h-12 w-12 text-slate-300" />
                  <p className="font-medium text-slate-700">Davomat yozuvlari yo'q</p>
                </div>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* Helper components */
function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: "emerald" | "blue" | "amber" | "purple";
}) {
  const colorClasses = {
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
    blue: "bg-blue-50 text-blue-700 ring-blue-200/60",
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

function InfoTile({
  icon,
  label,
  value,
  secondary,
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  secondary?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 ${className}`}
    >
      <div className="shrink-0 rounded-lg bg-white p-2 shadow-sm ring-1 ring-slate-200/60">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="mt-1 truncate text-sm font-medium text-slate-900">
          {value}
        </p>
        {secondary && (
          <p className="mt-0.5 truncate text-xs text-slate-500">{secondary}</p>
        )}
      </div>
    </div>
  );
}

