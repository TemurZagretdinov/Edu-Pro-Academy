import { NavLink, Outlet } from "react-router-dom";

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-ink text-white">
      <header className="fixed inset-x-0 top-0 z-20 border-b border-white/10 bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <NavLink to="/" className="text-xl font-bold">
            EduPro Academy
          </NavLink>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-white/75 md:flex">
            <NavLink to="/about" className="hover:text-white">
              About
            </NavLink>
            <NavLink to="/contact" className="hover:text-white">
              Contact
            </NavLink>
            <NavLink to="/register" className="hover:text-white">
              Ro'yxatdan o'tish
            </NavLink>
          </nav>
          <NavLink to="/register" className="rounded-md bg-coral px-4 py-2 text-sm font-semibold text-white md:hidden">
            Ro'yxatdan o'tish
          </NavLink>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
