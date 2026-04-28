import { useMemo, useState } from "react";
import {
  CheckCircle,
  ChevronRight,
  Clipboard,
  Copy,
  ExternalLink,
  FileText,
  Filter,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Send,
  User,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

import { getErrorMessage } from "../../api/client";
import { getGroups } from "../../api/groups";
import { approveApplication, getStudents, rejectApplication } from "../../api/students";
import { Button } from "../../components/ui/Button";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { useAsyncData } from "../../hooks/useAsyncData";
import type { ApplicationApproveResponse, Group, StudentListItem } from "../../types";

type ApplicationStatus = "all" | "new" | "in_review" | "approved" | "rejected";
type WizardStep = 1 | 2 | 3 | 4 | 5;

const statusConfig: Record<string, { label: string; className: string }> = {
  new: { label: "Yangi", className: "bg-blue-50 text-blue-700 ring-blue-200" },
  in_review: { label: "Ko'rib chiqilmoqda", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  trial_booked: { label: "Ko'rib chiqilmoqda", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  approved: { label: "Qabul qilindi", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  joined: { label: "Qabul qilindi", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  rejected: { label: "Rad etildi", className: "bg-rose-50 text-rose-700 ring-rose-200" },
};

function applicationStatus(student: StudentListItem) {
  return student.trial_lesson_status || "new";
}

function statusBucket(status: string): Exclude<ApplicationStatus, "all"> {
  if (status === "approved" || status === "joined") return "approved";
  if (status === "rejected") return "rejected";
  if (status === "in_review" || status === "trial_booked") return "in_review";
  return "new";
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("uz-UZ") : "-";
}

function fullName(student: StudentListItem) {
  return `${student.firstname} ${student.lastname}`.trim();
}

function botUsername() {
  return (import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "").replace(/^@/, "").trim();
}

function deepLink(code: string) {
  const username = botUsername();
  return username ? `https://t.me/${username}?start=${code}` : "";
}

function instructionText(code: string) {
  const username = botUsername();
  if (username) {
    return [
      "Assalomu alaykum! рџ‘‹",
      "",
      "Farzandingiz ma'lumotlarini ko'rish uchun quyidagi havolani bosing:",
      "",
      `https://t.me/${username}?start=${code}`,
      "",
      "Bot avtomatik ulashga harakat qiladi.",
    ].join("\n");
  }
  return [
    "Assalomu alaykum! рџ‘‹",
    "",
    "Farzandingizning davomat, baholar, vazifalar va bildirishnomalarini Telegram orqali kuzatishingiz mumkin.",
    "",
    "1. Telegram botga kiring",
    "2. вЂњрџ”— Ulash kodiвЂќ tugmasini bosing",
    `3. Ushbu kodni yuboring: ${code}`,
    "",
    "Shundan so'ng farzandingiz ma'lumotlari botda ko'rinadi.",
  ].join("\n");
}

export default function Applications() {
  const students = useAsyncData(getStudents, []);
  const groups = useAsyncData(() => getGroups({ limit: 500 }), []);
  const [selectedApplication, setSelectedApplication] = useState<StudentListItem | null>(null);
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [filter, setFilter] = useState<ApplicationStatus>("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [approveResult, setApproveResult] = useState<ApplicationApproveResponse | null>(null);

  const applications = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (students.data ?? []).filter((student) => {
      const bucket = statusBucket(applicationStatus(student));
      const matchesFilter = filter === "all" || bucket === filter;
      const matchesSearch =
        !query ||
        fullName(student).toLowerCase().includes(query) ||
        student.phone_number.toLowerCase().includes(query) ||
        (student.parent_phone_number || "").toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [students.data, filter, search]);

  const selectedGroup = groups.data?.find((group) => group.id === selectedGroupId) ?? null;
  const selectedCode = approveResult?.parent_connection_code?.code ?? null;

  function openWizard(application: StudentListItem) {
    setSelectedApplication(application);
    setSelectedGroupId(application.group_id ?? null);
    setWizardStep(1);
    setApproveResult(null);
    setError(null);
    setCopied(null);
  }

  async function copyValue(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(`${label} nusxalandi вњ…`);
      window.setTimeout(() => setCopied(null), 2200);
    } catch {
      setCopied("Nusxalab bo'lmadi");
    }
  }

  async function handleApprove() {
    if (!selectedApplication || !selectedGroupId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await approveApplication(selectedApplication.id, {
        group_id: selectedGroupId,
        generate_parent_code: true,
        relation_type: "guardian",
        create_student_user: true,
        password: "12345678",
      });
      setApproveResult(response);
      setWizardStep(4);
      await students.reload();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleReject(application: StudentListItem) {
    setBusy(true);
    setError(null);
    try {
      await rejectApplication(application.id);
      await students.reload();
      if (selectedApplication?.id === application.id) setSelectedApplication(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (students.loading || groups.loading) return <LoadingState />;
  if (students.error) return <ErrorState message={students.error} />;
  if (groups.error) return <ErrorState message={groups.error} />;

  const counts = (students.data ?? []).reduce(
    (acc, student) => {
      acc[statusBucket(applicationStatus(student))] += 1;
      return acc;
    },
    { new: 0, in_review: 0, approved: 0, rejected: 0 }
  );

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/40 bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-900 p-8 text-white shadow-xl shadow-slate-900/10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-cyan-100 ring-1 ring-white/10">
              <FileText size={14} />
              Arizalar markazi
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-3xl">Arizalar</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
              Yangi arizani ko'rib chiqing, guruhga biriktiring va ota-onaga Telegram ulash kodini bitta joyda tayyorlang.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            <Counter label="Yangi" value={counts.new} />
            <Counter label="Jarayonda" value={counts.in_review} />
            <Counter label="Qabul" value={counts.approved} />
            <Counter label="Rad" value={counts.rejected} />
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <section className="rounded-3xl border border-white/40 bg-white/80 p-5 shadow-xl shadow-slate-200/20 backdrop-blur-lg">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-xl flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ism yoki telefon bo'yicha qidirish"
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ["all", "Barchasi"],
              ["new", "Yangi"],
              ["in_review", "Jarayonda"],
              ["approved", "Qabul"],
              ["rejected", "Rad"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value as ApplicationStatus)}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  filter === value ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Filter size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        {applications.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
            <FileText className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-800">Ariza topilmadi</p>
            <p className="mt-1 text-sm text-slate-500">Filter yoki qidiruv so'zini o'zgartirib ko'ring.</p>
          </div>
        ) : (
          applications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              onOpen={() => openWizard(application)}
              onApprove={() => openWizard(application)}
              onReject={() => void handleReject(application)}
              busy={busy}
            />
          ))
        )}
      </section>

      {selectedApplication && (
        <WizardModal
          application={selectedApplication}
          groups={groups.data ?? []}
          step={wizardStep}
          setStep={setWizardStep}
          selectedGroup={selectedGroup}
          selectedGroupId={selectedGroupId}
          setSelectedGroupId={setSelectedGroupId}
          approveResult={approveResult}
          busy={busy}
          error={error}
          copied={copied}
          onClose={() => setSelectedApplication(null)}
          onApprove={() => void handleApprove()}
          onCopy={copyValue}
          selectedCode={selectedCode}
        />
      )}
    </div>
  );
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs font-medium text-slate-200">{label}</div>
    </div>
  );
}

function ApplicationCard({
  application,
  onOpen,
  onApprove,
  onReject,
  busy,
}: {
  application: StudentListItem;
  onOpen: () => void;
  onApprove: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  const status = applicationStatus(application);
  const config = statusConfig[status] ?? statusConfig.new;
  return (
    <article className="rounded-3xl border border-white/40 bg-white/85 p-5 shadow-xl shadow-slate-200/20 backdrop-blur-lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <User size={20} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-slate-950">{fullName(application)}</h3>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${config.className}`}>{config.label}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Phone size={14} />
                {application.phone_number}
              </span>
              {application.parent_phone_number && <span>Ota-ona: {application.parent_phone_number}</span>}
              <span>Yuborilgan: {formatDate(application.registration_date || application.created_at)}</span>
            </div>
            {application.comment && <p className="mt-2 line-clamp-1 text-sm text-slate-600">{application.comment}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={onOpen}>
            Ko'rish
          </Button>
          <Button type="button" onClick={onApprove} disabled={busy || statusBucket(status) === "approved"}>
            Qabul qilish
          </Button>
          <Button type="button" variant="danger" onClick={onReject} disabled={busy || statusBucket(status) === "rejected"}>
            Rad etish
          </Button>
        </div>
      </div>
    </article>
  );
}

function WizardModal({
  application,
  groups,
  step,
  setStep,
  selectedGroup,
  selectedGroupId,
  setSelectedGroupId,
  approveResult,
  busy,
  error,
  copied,
  onClose,
  onApprove,
  onCopy,
  selectedCode,
}: {
  application: StudentListItem;
  groups: Group[];
  step: WizardStep;
  setStep: (step: WizardStep) => void;
  selectedGroup: Group | null;
  selectedGroupId: number | null;
  setSelectedGroupId: (id: number | null) => void;
  approveResult: ApplicationApproveResponse | null;
  busy: boolean;
  error: string | null;
  copied: string | null;
  onClose: () => void;
  onApprove: () => void;
  onCopy: (label: string, value: string) => Promise<void>;
  selectedCode: string | null;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/10">
        <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-sm font-medium text-cyan-700">Arizani tasdiqlash</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">{fullName(application)}</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={20} />
          </button>
        </header>
        <div className="grid max-h-[calc(92vh-92px)] overflow-y-auto lg:grid-cols-[240px_1fr]">
          <aside className="border-b border-slate-200 bg-slate-50 p-4 lg:border-b-0 lg:border-r">
            {[1, 2, 3, 4, 5].map((item) => (
              <button
                key={item}
                onClick={() => setStep(item as WizardStep)}
                className={`mb-2 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium ${
                  step === item ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-white"
                }`}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 ring-1 ring-current/10">{item}</span>
                {["Ariza", "Guruh", "Student", "Telegram", "Finish"][item - 1]}
              </button>
            ))}
          </aside>
          <main className="space-y-6 p-6">
            {copied && <div className="rounded-2xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{copied}</div>}
            {error && <div className="rounded-2xl bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</div>}

            {step === 1 && <ApplicationReview application={application} />}
            {step === 2 && (
              <GroupSelect groups={groups} selectedGroupId={selectedGroupId} setSelectedGroupId={setSelectedGroupId} />
            )}
            {step === 3 && <StudentConfirm application={application} selectedGroup={selectedGroup} />}
            {step === 4 && (
              <TelegramPanel code={selectedCode} connected={Boolean(approveResult?.parent_connected)} onCopy={onCopy} />
            )}
            {step === 5 && <FinishPanel result={approveResult} code={selectedCode} onCopy={onCopy} />}

            <footer className="flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-5">
              <Button type="button" variant="secondary" onClick={() => setStep(Math.max(1, step - 1) as WizardStep)} disabled={step === 1}>
                Orqaga
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={onClose}>
                  Bekor qilish
                </Button>
                {step < 3 && (
                  <Button type="button" onClick={() => setStep((step + 1) as WizardStep)} disabled={step === 2 && !selectedGroupId}>
                    Davom etish
                    <ChevronRight size={16} className="ml-1" />
                  </Button>
                )}
                {step === 3 && (
                  <Button type="button" onClick={onApprove} disabled={busy || !selectedGroupId}>
                    {busy ? "Tasdiqlanmoqda..." : "Qabul qilish va guruhga biriktirish"}
                  </Button>
                )}
                {step === 4 && (
                  <Button type="button" onClick={() => setStep(5)} disabled={!approveResult}>
                    Yakunlash
                  </Button>
                )}
              </div>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}

function ApplicationReview({ application }: { application: StudentListItem }) {
  const status = applicationStatus(application);
  const config = statusConfig[status] ?? statusConfig.new;
  return (
    <section className="space-y-4">
      <h3 className="text-xl font-semibold text-slate-950">1. Ariza ma'lumotlari</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <Info label="Ism familiya" value={fullName(application)} />
        <Info label="Telefon" value={application.phone_number} />
        <Info label="Ota-ona telefoni" value={application.parent_phone_number || "-"} />
        <Info label="Yuborilgan sana" value={formatDate(application.registration_date || application.created_at)} />
        <Info label="Status" value={config.label} badgeClass={config.className} />
        <Info label="Izoh" value={application.comment || "-"} wide />
      </div>
    </section>
  );
}

function GroupSelect({
  groups,
  selectedGroupId,
  setSelectedGroupId,
}: {
  groups: Group[];
  selectedGroupId: number | null;
  setSelectedGroupId: (id: number | null) => void;
}) {
  if (groups.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 p-8 text-center">
        <Users className="mx-auto h-12 w-12 text-slate-300" />
        <h3 className="mt-3 text-lg font-semibold text-slate-900">Hozircha guruh mavjud emas</h3>
        <p className="mt-1 text-sm text-slate-500">Avval guruh yarating, keyin arizani tasdiqlang.</p>
        <Link to="/admin/groups" className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          Guruh yaratish
        </Link>
      </section>
    );
  }
  return (
    <section className="space-y-4">
      <h3 className="text-xl font-semibold text-slate-950">2. Guruh tanlash</h3>
      <div className="grid gap-3">
        {groups.map((group) => (
          <button
            key={group.id}
            onClick={() => setSelectedGroupId(group.id)}
            className={`rounded-2xl border p-4 text-left transition ${
              selectedGroupId === group.id ? "border-cyan-400 bg-cyan-50 ring-4 ring-cyan-100" : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950">{group.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {group.teacher?.full_name || "O'qituvchi biriktirilmagan"} В· {group.students_count} ta talaba
                  {group.lesson_days ? ` В· ${group.lesson_days}` : ""}
                  {group.lesson_time ? ` ${group.lesson_time}` : ""}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${group.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                {group.is_active ? "Faol" : "Nofaol"}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function StudentConfirm({ application, selectedGroup }: { application: StudentListItem; selectedGroup: Group | null }) {
  return (
    <section className="space-y-4">
      <h3 className="text-xl font-semibold text-slate-950">3. Student account</h3>
      <div className="rounded-3xl bg-slate-50 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Info label="Student" value={fullName(application)} />
          <Info label="Telefon" value={application.phone_number} />
          <Info label="Guruh" value={selectedGroup?.name || "Tanlanmagan"} />
          <Info label="Holat" value="Faol" />
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Tasdiqlangandan keyin ariza qabul qilinadi, student shu guruhga biriktiriladi va ota-ona uchun Telegram ulash kodi yaratiladi.
        </p>
      </div>
    </section>
  );
}

function TelegramPanel({
  code,
  connected,
  onCopy,
}: {
  code: string | null;
  connected: boolean;
  onCopy: (label: string, value: string) => Promise<void>;
}) {
  const link = code ? deepLink(code) : "";
  return (
    <section className="space-y-4">
      <h3 className="text-xl font-semibold text-slate-950">4. Ota-onani Telegramga ulash</h3>
      {!code ? (
        <div className="rounded-2xl bg-amber-50 p-4 text-sm font-medium text-amber-700">Kod approve qilingandan keyin yaratiladi.</div>
      ) : (
        <div className="rounded-3xl border border-cyan-100 bg-cyan-50 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-cyan-700">Ota-onaga yuboriladigan kod</p>
              <p className="mt-2 text-3xl font-semibold tracking-[0.16em] text-slate-900">{code}</p>
              <p className="mt-2 text-sm text-slate-600">{connected ? "вњ… Ulangan" : "вќЊ Hali ulanmagan"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => void onCopy("Kod", code)}>
                <Copy size={16} className="mr-1" />
                Kodni nusxalash
              </Button>
              <Button type="button" variant="secondary" onClick={() => void onCopy("Yo'riqnoma", instructionText(code))}>
                <Clipboard size={16} className="mr-1" />
                Yo'riqnoma
              </Button>
              {link && (
                <a className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white" href={link} target="_blank" rel="noreferrer">
                  <ExternalLink size={16} className="mr-1" />
                  Botni ochish
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function FinishPanel({
  result,
  code,
  onCopy,
}: {
  result: ApplicationApproveResponse | null;
  code: string | null;
  onCopy: (label: string, value: string) => Promise<void>;
}) {
  if (!result) return <TelegramPanel code={code} connected={false} onCopy={onCopy} />;
  return (
    <section className="space-y-5">
      <div className="rounded-3xl bg-emerald-50 p-6 text-emerald-800">
        <CheckCircle className="h-10 w-10" />
        <h3 className="mt-3 text-xl font-semibold">Ariza muvaffaqiyatli qabul qilindi</h3>
        <p className="mt-1 text-sm">Student yaratildi/yangilandi, guruhga biriktirildi va ota-ona ulash kodi tayyorlandi.</p>
      </div>
      <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 md:grid-cols-2">
        <Info label="Student" value={`${result.student.firstname} ${result.student.lastname}`} />
        <Info label="Guruh" value={result.group?.name || "-"} />
        <Info label="Login email" value={result.email || "Email yo'q"} />
        <Info label="Default parol" value={result.default_password || "-"} />
      </div>
      {result.account_warning && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-700">
          {result.account_warning}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Link to={`/admin/students/${result.student.id}`} className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          Student profilini ochish
        </Link>
        {result.group && (
          <Link to={`/admin/groups/${result.group.id}`} className="inline-flex items-center rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
            Guruhni ochish
          </Link>
        )}
        {code && (
          <Button type="button" variant="secondary" onClick={() => void onCopy("Kod", code)}>
            Kodni nusxalash
          </Button>
        )}
      </div>
    </section>
  );
}

function Info({ label, value, wide, badgeClass }: { label: string; value: string; wide?: boolean; badgeClass?: string }) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      {badgeClass ? (
        <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ${badgeClass}`}>{value}</span>
      ) : (
        <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
      )}
    </div>
  );
}


