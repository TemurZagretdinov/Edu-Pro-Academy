import { BarChart3, BookOpen, CalendarCheck, ClipboardList, CreditCard, FileText, GraduationCap, LogOut, Menu, Users } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/admin/students", label: "Talabalar", icon: GraduationCap },
  { to: "/admin/teachers", label: "O'qituvchilar", icon: Users },
  { to: "/admin/groups", label: "Guruhlar", icon: BookOpen },
  { to: "/admin/payments", label: "To'lovlar", icon: CreditCard },
  { to: "/admin/attendance", label: "Davomat", icon: CalendarCheck },
  { to: "/admin/homework", label: "Vazifalar", icon: ClipboardList },
  { to: "/admin/applications", label: "Arizalar", icon: FileText },
];

export function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200/70 bg-white/90 p-6 shadow-sm backdrop-blur-xl lg:block">
        <NavLink to="/" className="flex items-center gap-3 text-lg font-semibold text-slate-900">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-semibold text-white">
            EP
          </span>
          <span>EduPro Admin</span>
        </NavLink>
        <nav className="mt-8 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  isActive ? "bg-slate-100 font-semibold text-slate-900" : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <Menu className="lg:hidden" />
            <div>
              <p className="text-sm font-normal text-slate-500">Education center management</p>
              <h1 className="text-xl font-semibold text-slate-900">Admin panel</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-medium text-slate-600 sm:inline">{user?.full_name}</span>
            <NavLink to="/" className="rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
              Sayt
            </NavLink>
            <button onClick={logout} className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white">
              <LogOut size={16} className="inline" /> Chiqish
            </button>
          </div>
        </header>
        <main className="p-4 pb-24 md:p-8 md:pb-28">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
