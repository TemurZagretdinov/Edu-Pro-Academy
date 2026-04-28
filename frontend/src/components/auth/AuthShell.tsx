import type { ReactNode } from "react";
import { BookOpenCheck, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { NavLink } from "react-router-dom";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  panelTitle: string;
  panelDescription: string;
  children: ReactNode;
  footer?: ReactNode;
};

const highlights = [
  "Davomat va vazifalar nazorati",
  "Mentorlar uchun tartibli panel",
  "Admin boshqaruvi bitta joyda",
];

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <NavLink
      to="/"
      className="group inline-flex items-center gap-3 text-white transition-all duration-200 hover:opacity-90"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.2),inset_0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur transition-all duration-300 group-hover:border-white/25 group-hover:bg-white/10 group-hover:shadow-[0_8px_20px_-6px_rgba(31,199,182,0.2)]">
        <BookOpenCheck
          size={22}
          className="text-cyan-400 transition-transform duration-300 group-hover:scale-105"
        />
      </span>
      {!compact && (
        <span>
          <span className="block text-base font-extrabold leading-tight tracking-tight">
            EduPro Academy
          </span>
          <span className="block text-[11px] font-medium uppercase tracking-wider text-white/45">
            Modern education center
          </span>
        </span>
      )}
    </NavLink>
  );
}

export function AuthShell({
  eyebrow,
  title,
  description,
  panelTitle,
  panelDescription,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_15%,rgba(31,199,182,0.15)_0%,transparent_35%),radial-gradient(circle_at_85%_25%,rgba(255,107,92,0.1)_0%,transparent_40%),linear-gradient(145deg,#081626_0%,#0c263a_50%,#10304a_100%)] px-4 py-6 text-white sm:px-6 lg:px-8">
      {/* Grid pattern and top glow */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M30%200v60M0%2030h60%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.03)%22%20stroke-width%3D%220.8%22%2F%3E%3C%2Fsvg%3E')] opacity-30" />
      <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-white/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-7xl items-center gap-8 lg:grid-cols-[1fr_1.1fr]">
        {/* Left content area */}
        <section className="hidden lg:block">
          <BrandMark />

          <div className="mt-12 max-w-xl">
            <span className="inline-flex items-center rounded-full border border-cyan-500/25 bg-cyan-500/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-300 backdrop-blur-sm shadow-[0_2px_8px_-4px_rgba(31,199,182,0.1)]">
              <Sparkles size={12} className="mr-1.5 text-cyan-300/80" />
              {eyebrow}
            </span>

            <h1 className="mt-6 text-5xl font-extrabold leading-[1.15] tracking-tight text-white lg:text-6xl">
              {title}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-white/65">
              {description}
            </p>
          </div>

          <ul className="mt-10 grid max-w-md gap-2.5">
            {highlights.map((item) => (
              <li
                key={item}
                className="group flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-5 py-3.5 text-sm font-medium text-white/75 backdrop-blur-sm transition-all duration-200 hover:border-white/10 hover:bg-white/[0.05] hover:shadow-[0_6px_16px_-6px_rgba(0,0,0,0.2)]"
              >
                <CheckCircle2
                  size={18}
                  className="shrink-0 text-cyan-400 transition-transform duration-200 group-hover:scale-105"
                />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-12 grid max-w-lg grid-cols-2 gap-4">
            <div className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04] hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.25)] hover:-translate-y-0.5">
              <div className="mb-1">
                <ShieldCheck className="text-coral-400 transition-transform duration-300 group-hover:scale-105" />
              </div>
              <p className="text-4xl font-black tracking-tight text-white">1200+</p>
              <p className="mt-1.5 text-xs font-medium uppercase tracking-wider text-white/45">
                Bitiruvchi
              </p>
            </div>
            <div className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04] hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.25)] hover:-translate-y-0.5">
              <div className="mb-1">
                <Sparkles className="text-cyan-400 transition-transform duration-300 group-hover:scale-105" />
              </div>
              <p className="text-4xl font-black tracking-tight text-white">18</p>
              <p className="mt-1.5 text-xs font-medium uppercase tracking-wider text-white/45">
                Mentor
              </p>
            </div>
          </div>
        </section>

        {/* Right panel (auth form container) */}
        <section className="mx-auto w-full max-w-lg">
          <div className="mb-7 flex justify-center lg:hidden">
            <BrandMark />
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-[1px] shadow-2xl shadow-black/30 backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.4)]">
            <div className="rounded-[22px] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 sm:p-7">
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-md sm:p-8">
                <div className="mb-8">
                  <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
                    {panelTitle}
                  </p>
                  <h2 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
                    {panelDescription}
                  </h2>
                </div>
                {children}
              </div>
            </div>
          </div>

          {footer && (
            <div className="mt-6 text-center text-xs font-medium text-white/45">
              {footer}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
