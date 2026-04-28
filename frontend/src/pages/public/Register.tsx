import { useState } from "react";
import { ArrowRight, User, Phone, Mail, MapPin, MessageSquare, Users, CheckCircle } from "lucide-react";
import { NavLink } from "react-router-dom";

import { getErrorMessage } from "../../api/client";
import { registerStudent } from "../../api/students";
import { AuthAlert, AuthTextField, AuthTextarea } from "../../components/auth/AuthFields";

type RegisterForm = {
  fullName: string;
  phone_number: string;
  parent_phone_number: string;
  email: string;
  address: string;
  comment: string;
  trial_lesson_status: string;
};

type RegisterErrors = Partial<Record<keyof RegisterForm, string>>;

const emptyForm: RegisterForm = {
  fullName: "",
  phone_number: "",
  parent_phone_number: "",
  email: "",
  address: "",
  comment: "",
  trial_lesson_status: "new",
};

export default function Register() {
  const [form, setForm] = useState<RegisterForm>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<RegisterErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function validateForm() {
    const errors: RegisterErrors = {};
    const nameParts = form.fullName.trim().split(/\s+/).filter(Boolean);

    if (nameParts.length < 2) errors.fullName = "Ism va familiyangizni kiriting.";
    if (form.phone_number.trim().length < 5) errors.phone_number = "Telefon raqamni to‘liq kiriting.";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    if (!validateForm()) return;

    const [firstname, ...lastNameParts] = form.fullName.trim().split(/\s+/);

    setLoading(true);
    try {
      await registerStudent({
        firstname,
        lastname: lastNameParts.join(" "),
        phone_number: form.phone_number.trim(),
        parent_phone_number: form.parent_phone_number.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        group_id: null,
        teacher_id: null,
        registration_date: new Date().toISOString().slice(0, 10),
        is_active: true,
        comment: form.comment.trim() || null,
        trial_lesson_status: form.trial_lesson_status,
        passport: null,
      });
      setSuccess(true);
      setForm(emptyForm);
      setFieldErrors({});
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-3 md:p-4 lg:h-screen lg:min-h-0 lg:overflow-hidden">
      {/* Main Card */}
      <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl shadow-2xl shadow-black/30 backdrop-blur-sm lg:h-full lg:max-h-[calc(100vh-2rem)] lg:grid-cols-2">
        
        {/* LEFT PANEL - Blue-Purple Gradient */}
        <div className="relative flex flex-col bg-gradient-to-br from-[#1A2A6C] via-[#1A3A8A] to-[#2193b0] p-5 md:p-7 lg:p-8">
          {/* Background decorative elements */}
          <div className="absolute inset-0 overflow-hidden opacity-20">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-0 w-60 h-60 bg-cyan-300/10 rounded-full blur-3xl" />
            <div className="absolute top-1/3 left-10 w-32 h-32 bg-blue-200/10 rounded-full blur-2xl" />
          </div>

          {/* Logo / Badge */}
          <div className="relative z-10 mb-4 flex items-center gap-2">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
              <Users size={28} className="text-white" />
            </div>
            <span className="text-white/90 text-sm font-semibold tracking-wider uppercase">EduPro Academy</span>
          </div>

          {/* Main Welcome Text */}
          <div className="relative z-10 flex-1">
            <h2 className="mb-3 text-3xl font-bold leading-tight text-white md:text-4xl">
              Hello! Welcome to <br />
              <span className="text-cyan-200">EduPro</span> platform
            </h2>
            <p className="mb-6 max-w-md text-base text-white/70 md:text-lg">
              Join us for a free trial lesson. Our administrator will help you choose the right course and schedule.
            </p>

            {/* Sign In CTA */}
            <NavLink
              to="/student/login"
              className="inline-flex items-center justify-center px-8 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#0B0E14] font-semibold text-lg transition-all duration-200 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30"
            >
              Sign In
              <ArrowRight size={20} className="ml-2" />
            </NavLink>
          </div>

          {/* Decorative illustration blocks */}
          <div className="relative z-10 mt-6 grid grid-cols-3 gap-3 opacity-70">
            <div className="h-14 rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm lg:h-16"></div>
            <div className="h-14 row-span-2 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm lg:h-16"></div>
            <div className="h-14 rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm lg:h-16"></div>
            <div className="h-14 rounded-2xl border border-cyan-300/30 bg-cyan-300/20 backdrop-blur-sm lg:h-16"></div>
            <div className="col-span-2 h-14 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm lg:h-16"></div>
            <div className="col-span-3 mt-1 flex justify-between">
              <div className="w-12 h-12 rounded-full bg-cyan-300/20 backdrop-blur-sm border border-cyan-300/30"></div>
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10"></div>
              <div className="w-12 h-12 rounded-full bg-blue-300/20 backdrop-blur-sm border border-blue-300/30"></div>
            </div>
          </div>

          {/* Bottom text */}
          <div className="relative z-10 mt-5 text-xs text-white/40">
            <p>Secure • Encrypted • 24/7 Support</p>
          </div>
        </div>

        {/* RIGHT PANEL - Dark Slate */}
        <div className="flex h-full min-h-0 flex-col bg-[#141A24] p-5 md:p-6 lg:p-7">
          {/* Mini Logo */}
          <div className="mb-3 flex justify-end">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
              <div className="w-2 h-2 rounded-full bg-blue-400"></div>
              <div className="w-2 h-2 rounded-full bg-purple-400"></div>
              <span className="ml-2 text-white/60 text-xs font-mono">v2.4.1</span>
            </div>
          </div>

          {/* Sign Up Header */}
          <div className="mb-4">
            <h1 className="mb-1 text-2xl font-bold text-white md:text-3xl">Create Account</h1>
            <p className="text-white/50 text-sm">Get started with your free trial lesson</p>
          </div>

          {/* Role Switcher */}
          <div className="mb-3 flex flex-wrap items-center justify-center gap-2 rounded-xl border border-gray-700/50 bg-[#1E2532]/50 p-2 text-sm">
            <span className="text-white/50 mr-1">Login as:</span>
            <NavLink to="/admin/login" className="font-medium text-cyan-400 hover:text-cyan-300 transition px-2 py-1 rounded-lg hover:bg-white/5">
              Admin
            </NavLink>
            <span className="text-white/20">•</span>
            <NavLink to="/teacher/login" className="font-medium text-cyan-400 hover:text-cyan-300 transition px-2 py-1 rounded-lg hover:bg-white/5">
              Teacher
            </NavLink>
            <span className="text-white/20">•</span>
            <NavLink to="/student/login" className="font-medium text-cyan-400 hover:text-cyan-300 transition px-2 py-1 rounded-lg hover:bg-white/5">
              Student
            </NavLink>
          </div>

          {/* Info Alert */}
          <div className="mb-4 rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-2.5 text-center">
            <p className="text-sm leading-relaxed text-white/80">
              📚 <strong className="text-cyan-300">Trial lesson is free!</strong> Our administrator will contact you to arrange everything.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && <AuthAlert>{error}</AuthAlert>}
            {success && (
              <AuthAlert tone="success">
                <div className="flex items-center gap-2">
                  <CheckCircle size={18} />
                  <span>Application received! We'll contact you shortly.</span>
                </div>
              </AuthAlert>
            )}

            {/* Full Name */}
            <AuthTextField
              id="register-full-name"
              label="Full Name"
              value={form.fullName}
              onChange={(event) => setForm({ ...form, fullName: event.target.value })}
              placeholder="First Last"
              autoComplete="name"
              error={fieldErrors.fullName}
              required
              leftIcon={<User size={18} className="text-white/40" />}
              className="!rounded-xl !py-2.5"
            />

            {/* Phone & Parent Phone */}
            <div className="grid gap-3 sm:grid-cols-2">
              <AuthTextField
                id="register-phone"
                label="Phone Number"
                value={form.phone_number}
                onChange={(event) => setForm({ ...form, phone_number: event.target.value })}
                placeholder="+998 90 123 45 67"
                autoComplete="tel"
                error={fieldErrors.phone_number}
                required
                leftIcon={<Phone size={18} className="text-white/40" />}
                className="!rounded-xl !py-2.5"
              />
              <AuthTextField
                id="register-parent-phone"
                label="Parent's Phone"
                value={form.parent_phone_number}
                onChange={(event) => setForm({ ...form, parent_phone_number: event.target.value })}
                placeholder="+998 90 123 45 67"
                autoComplete="tel"
                leftIcon={<Users size={18} className="text-white/40" />}
                className="!rounded-xl !py-2.5"
              />
            </div>

            {/* Email & Address */}
            <div className="grid gap-3 sm:grid-cols-2">
              <AuthTextField
                id="register-email"
                label="Email"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="name@example.com"
                autoComplete="email"
                leftIcon={<Mail size={18} className="text-white/40" />}
                className="!rounded-xl !py-2.5"
              />
              <AuthTextField
                id="register-address"
                label="Address"
                value={form.address}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
                placeholder="Tashkent, ..."
                autoComplete="street-address"
                leftIcon={<MapPin size={18} className="text-white/40" />}
                className="!rounded-xl !py-2.5"
              />
            </div>

            {/* Comment */}
            <AuthTextarea
              id="register-comment"
              label="Comment (optional)"
              value={form.comment}
              onChange={(event) => setForm({ ...form, comment: event.target.value })}
              placeholder="Which course are you interested in? Programming, Design, Marketing, or English?"
              leftIcon={<MessageSquare size={18} className="text-white/40" />}
              className="!min-h-20 !resize-none !rounded-xl !py-2.5"
            />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-3 font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all duration-200 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  Send Application
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {/* Terms */}
            <p className="text-center text-white/30 text-xs pt-2">
              By registering, you agree to our{" "}
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
