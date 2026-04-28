import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Mail, Lock, UserCog, GraduationCap, Users } from "lucide-react";
import { Navigate, NavLink, useNavigate } from "react-router-dom";

import { bootstrapAdmin } from "../api/auth";
import { getAuthErrorMessage, getResponseStatus } from "../api/client";
import { AuthAlert, AuthTextField } from "../components/auth/AuthFields";
import { AuthShell } from "../components/auth/AuthShell";
import { useAuth } from "../hooks/useAuth";

type LoginProps = {
  role: "admin" | "teacher" | "student";
};

export default function Login({ role }: LoginProps) {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [adminAlreadyCreated, setAdminAlreadyCreated] = useState(false);

  const targetPath = role === "admin" ? "/admin/dashboard" : role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";

  if (user?.role === role) return <Navigate to={targetPath} replace />;

  const isAdmin = role === "admin";
  const isTeacher = role === "teacher";
  
  const roleConfig = {
    admin: {
      icon: UserCog,
      gradient: "from-purple-600 to-indigo-600",
      badge: "Admin",
      badgeColor: "bg-purple-500/20 text-purple-300",
      copy: {
        eyebrow: "EduPro Academy boshqaruvi",
        title: "Akademiyani ishonchli boshqarish uchun premium panel",
        description: "Talabalar, mentorlar, to'lovlar va dars jarayonini zamonaviy CRM orqali nazorat qiling",
        panelTitle: "Admin panelga kirish",
        panelDescription: "EduPro boshqaruv paneli"
      }
    },
    teacher: {
      icon: GraduationCap,
      gradient: "from-blue-600 to-cyan-600",
      badge: "Teacher",
      badgeColor: "bg-blue-400/20 text-blue-300",
      copy: {
        eyebrow: "Mentor ish maydoni",
        title: "Guruhlar, davomat va vazifalar bitta tartibli panelda",
        description: "O'quvchilar natijasini kuzating, vazifalarni boshqaring va dars jarayonini tez yuriting",
        panelTitle: "O'qituvchi paneliga kirish",
        panelDescription: "Mentor paneliga xush kelibsiz"
      }
    },
    student: {
      icon: Users,
      gradient: "from-green-600 to-emerald-600",
      badge: "Student",
      badgeColor: "bg-green-500/20 text-green-300",
      copy: {
        eyebrow: "Talaba kabineti",
        title: "O'quv jarayoningizni shaxsiy kabinetda kuzating",
        description: "Profil, davomat, to'lovlar va vazifalarni faqat o'qish rejimida ko'ring",
        panelTitle: "Talaba kabinetiga kirish",
        panelDescription: "Mening EduPro sahifam"
      }
    }
  };

  const config = roleConfig[role];
  const RoleIcon = config.icon;

  function validateForm() {
    const errors: { email?: string; password?: string } = {};
    const normalizedEmail = email.trim();

    if (!normalizedEmail) errors.email = "Email kiriting";
    if (!password) errors.password = "Parol kiriting";
    else if (password.length < 6) errors.password = "Parol kamida 6 belgidan iborat bo'lishi kerak";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (!validateForm()) return;

    setLoading(true);
    try {
      const authenticated = await login(email.trim(), password);
      if (authenticated.role !== role) {
        logout();
        setError(role === "admin" ? "Admin huquqi kerak" : role === "teacher" ? "O'qituvchi huquqi kerak" : "Talaba huquqi kerak");
        return;
      }
      navigate(targetPath);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleBootstrap() {
    setBootstrapping(true);
    setError(null);
    setSuccess(null);
    try {
      await bootstrapAdmin();
      setAdminAlreadyCreated(true);
      setSuccess("Admin muvaffaqiyatli yaratildi. Endi tizimga kiring.");
    } catch (err) {
      if (getResponseStatus(err) === 409) {
        setAdminAlreadyCreated(true);
        setSuccess("Admin allaqachon yaratilgan. Email va parol orqali kiring.");
      } else {
        setError(getAuthErrorMessage(err));
      }
    } finally {
      setBootstrapping(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4 md:p-6">
      {/* Main Card */}
      <div className="w-full max-w-6xl rounded-3xl shadow-2xl shadow-black/30 overflow-hidden grid grid-cols-1 lg:grid-cols-2 backdrop-blur-sm">
        
        {/* LEFT PANEL - Gradient */}
        <div className="relative bg-gradient-to-br from-[#1A2A6C] via-[#1A3A8A] to-[#2193b0] p-6 md:p-10 flex flex-col">
          {/* Background decorative elements */}
          <div className="absolute inset-0 overflow-hidden opacity-20">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-0 w-60 h-60 bg-cyan-300/10 rounded-full blur-3xl" />
            <div className="absolute top-1/3 left-10 w-32 h-32 bg-blue-200/10 rounded-full blur-2xl" />
          </div>

          {/* Logo / Role Icon */}
          <div className="relative z-10 flex items-center gap-2 mb-6">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
              <RoleIcon size={28} className="text-white" />
            </div>
            <span className="text-white/90 text-sm font-semibold tracking-wider uppercase">{config.copy.eyebrow}</span>
          </div>

          {/* Main Welcome Text */}
          <div className="relative z-10 flex-1">
            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
              Hello! Welcome to the <br />
              <span className="text-cyan-200">EduPro</span> platform
            </h2>
            <p className="text-white/70 text-base md:text-lg mb-8 max-w-md">
              {config.copy.description}
            </p>

            {/* Sign Up CTA */}
            <NavLink
              to="/register"
              className="inline-flex items-center justify-center px-8 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#0B0E14] font-semibold text-lg transition-all duration-200 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30"
            >
              Sign Up
              <ArrowRight size={20} className="ml-2" />
            </NavLink>
          </div>

          {/* Decorative illustration - Trading/Finance blocks */}
          <div className="relative z-10 mt-10 grid grid-cols-3 gap-3 opacity-70">
            <div className="h-20 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10"></div>
            <div className="h-20 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/5 row-span-2"></div>
            <div className="h-20 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10"></div>
            <div className="h-20 bg-cyan-300/20 rounded-2xl backdrop-blur-sm border border-cyan-300/30"></div>
            <div className="h-20 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/5 col-span-2"></div>
            <div className="col-span-3 flex justify-between mt-2">
              <div className="w-12 h-12 rounded-full bg-cyan-300/20 backdrop-blur-sm border border-cyan-300/30"></div>
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10"></div>
              <div className="w-12 h-12 rounded-full bg-blue-300/20 backdrop-blur-sm border border-blue-300/30"></div>
            </div>
          </div>

          {/* Small text at bottom */}
          <div className="relative z-10 mt-8 text-white/40 text-xs">
            <p>Secure • Encrypted • 24/7 Support</p>
          </div>
        </div>

        {/* RIGHT PANEL - Dark Slate */}
        <div className="bg-[#141A24] p-6 md:p-10 flex flex-col">
          {/* Mini Logo */}
          <div className="mb-8 flex justify-end">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
              <div className="w-2 h-2 rounded-full bg-blue-400"></div>
              <div className="w-2 h-2 rounded-full bg-purple-400"></div>
              <span className="ml-2 text-white/60 text-xs font-mono">v2.4.1</span>
            </div>
          </div>

          {/* Sign In Header */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Sign In</h1>
            <p className="text-white/50 text-sm">Access your {config.badge} account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5">
            {/* Alerts */}
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                <p className="text-sm text-green-400">{success}</p>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-white/70">Login or email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-cyan-400/70" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  placeholder={isAdmin ? "admin@edupro.uz" : isTeacher ? "teacher@edupro.uz" : "student@example.com"}
                  className={`w-full rounded-xl border bg-[#1E2532] py-3 pl-11 pr-4 text-white placeholder:text-white/30 outline-none transition-all duration-200 ${
                    fieldErrors.email
                      ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
                      : "border-gray-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                  }`}
                />
              </div>
              {fieldErrors.email && <p className="text-xs text-red-400">{fieldErrors.email}</p>}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-white/70">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-cyan-400/70" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder="••••••••"
                  className={`w-full rounded-xl border bg-[#1E2532] py-3 pl-11 pr-12 text-white placeholder:text-white/30 outline-none transition-all duration-200 ${
                    fieldErrors.password
                      ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
                      : "border-gray-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-white/40 hover:text-cyan-400 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && <p className="text-xs text-red-400">{fieldErrors.password}</p>}
            </div>

            {/* Captcha placeholder (visual only) */}
            <div className="rounded-xl border border-gray-700 bg-[#1E2532]/50 p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-cyan-400/20 flex items-center justify-center text-cyan-400 text-xs font-mono">4F2A</div>
                <span className="text-white/40 text-xs">Verification code</span>
              </div>
              <button type="button" className="text-cyan-400 text-xs hover:text-cyan-300 transition-colors">
                Refresh
              </button>
            </div>

            {/* Links row */}
            <div className="flex items-center justify-between text-sm">
              <button type="button" className="text-white/50 hover:text-cyan-400 transition-colors">
                Forgot password?
              </button>
              <NavLink
                to={isAdmin ? "/teacher/login" : isTeacher ? "/student/login" : "/admin/login"}
                className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
              >
                {isAdmin ? "Teacher login →" : isTeacher ? "Student login →" : "Admin login →"}
              </NavLink>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-3.5 px-5 font-semibold text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {/* Bootstrap Admin Button */}
            {isAdmin && !adminAlreadyCreated && (
              <button
                type="button"
                onClick={handleBootstrap}
                disabled={bootstrapping}
                className="w-full rounded-xl border border-gray-700 bg-[#1E2532] py-3 text-sm font-medium text-white/70 hover:bg-[#2A3442] hover:text-white transition-colors disabled:opacity-50"
              >
                {bootstrapping ? "Creating admin..." : "Initialize first admin"}
              </button>
            )}

            {/* Terms text */}
            <p className="text-center text-white/30 text-xs mt-4">
              By signing in, you agree to our{" "}
              <a href="#" className="text-cyan-400/70 hover:text-cyan-400 underline-offset-2 hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-cyan-400/70 hover:text-cyan-400 underline-offset-2 hover:underline">
                Privacy Policy
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}