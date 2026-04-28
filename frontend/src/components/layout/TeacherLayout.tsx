import { BarChart3, BookOpen, CalendarCheck, CalendarDays, ClipboardList, GraduationCap, LogOut, Menu } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";

const navItems = [
  { to: "/teacher/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/teacher/groups", label: "Mening guruhlarim", icon: BookOpen },
  { to: "/teacher/students", label: "Talabalar", icon: GraduationCap },
  { to: "/teacher/attendance", label: "Davomat", icon: CalendarCheck },
  { to: "/teacher/schedule", label: "Jadval", icon: CalendarDays },
  { to: "/teacher/homework", label: "Vazifalar", icon: ClipboardList },
];

export function TeacherLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white p-5 lg:block">
        <NavLink to="/" className="flex items-center gap-3 text-lg font-bold text-slate-950">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal text-ink">T</span>
          Teacher Panel
        </NavLink>
        <nav className="mt-8 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition ${
                  isActive ? "bg-teal text-ink" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <Menu className="lg:hidden" />
            <div>
              <p className="text-sm text-slate-500">O'qituvchi ish maydoni</p>
              <h1 className="text-lg font-bold text-slate-950">{user?.full_name}</h1>
            </div>
          </div>
          <button onClick={logout} className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
            <LogOut size={16} className="inline" /> Chiqish
          </button>
        </header>
        <main className="p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
