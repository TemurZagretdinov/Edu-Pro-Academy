import { ArrowLeft, Home, Search, AlertCircle } from "lucide-react";
import { NavLink, useNavigate, useRouteError } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();
  const error = useRouteError();
  const isRouteError = error instanceof Response;
  const errorCode = isRouteError ? error.status : 404;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 px-4">
      {/* Decorative elements */}
      <div className="absolute top-0 -right-40 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="absolute bottom-0 -left-40 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
      
      {/* Animated circles */}
      <div className="absolute top-20 left-10 h-20 w-20 rounded-full border border-white/10 animate-pulse" />
      <div className="absolute bottom-20 right-10 h-32 w-32 rounded-full border border-white/10 animate-pulse delay-1000" />

      <section className="relative w-full max-w-xl rounded-2xl border border-white/20 bg-white/10 p-8 text-center shadow-2xl backdrop-blur-xl transition-all hover:shadow-3xl sm:p-10">
        {/* Glowing orb */}
        <div className="absolute -top-10 left-1/2 h-20 w-20 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-400 opacity-20 blur-xl" />
        
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-400 blur-md opacity-50" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-cyan-500 shadow-lg">
              <Search size={40} className="text-white" />
            </div>
          </div>
        </div>

        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-sm">
          <AlertCircle size={14} className="text-cyan-400" />
          <span className="text-sm font-semibold text-cyan-400">Xato {errorCode}</span>
        </div>

        <h1 className="mt-4 text-5xl font-black tracking-tight text-white sm:text-6xl">
          Sahifa topilmadi
        </h1>
        
        <p className="mx-auto mt-4 max-w-md text-white/70">
          {isRouteError && error.statusText 
            ? error.statusText 
            : "Bu manzil mavjud emas yoki siz eski havolani ochdingiz."}
        </p>
        
        <p className="mt-2 text-sm text-white/50">
          Bosh sahifaga qayting yoki oldingi sahifaga o'ting
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <NavLink
            to="/"
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl hover:scale-105"
          >
            <Home size={18} className="transition-transform group-hover:-translate-y-0.5" />
            Bosh sahifa
          </NavLink>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="group inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:scale-105"
          >
            <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-0.5" />
            Orqaga
          </button>
        </div>

        {/* Decorative line */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-xs text-white/40">
            Agar muammo takrorlansa, administrator bilan bog'lanishingiz mumkin
          </p>
        </div>
      </section>
    </main>
  );
}
