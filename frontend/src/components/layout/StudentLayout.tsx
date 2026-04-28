import { BarChart3, BookOpenCheck, CalendarDays, ClipboardList, CreditCard, LogOut, Menu, UserRound } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";

const navItems = [
  { to: "/student/dashboard", label: "Mening dashboardim", icon: BarChart3 },
  { to: "/student/profile", label: "Profil", icon: UserRound },
  { to: "/student/attendance", label: "Davomat tarixi", icon: BookOpenCheck },
  { to: "/student/payments", label: "To'lovlar", icon: CreditCard },
  { to: "/student/homework", label: "Vazifalar", icon: ClipboardList },
  { to: "/student/schedule", label: "Dars jadvali", icon: CalendarDays },
];

export function StudentLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white p-5 lg:block">
        <NavLink to="/" className="flex items-center gap-3 text-lg font-semibold text-slate-900">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal font-semibold text-ink">S</span>
          Student Portal
        </NavLink>
        <nav className="mt-8 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                  isActive ? "bg-teal font-semibold text-ink" : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"
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
              <p className="text-sm text-slate-500">Talaba kabineti</p>
              <h1 className="text-lg font-semibold text-slate-900">{user?.full_name}</h1>
            </div>
          </div>
          <button onClick={logout} className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white">
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

