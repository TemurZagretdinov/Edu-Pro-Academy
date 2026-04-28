import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import type { AuthRole } from "../../types";

type ProtectedRouteProps = {
  role?: AuthRole | AuthRole[];
};

function loginPathForRole(role?: AuthRole | AuthRole[]) {
  const roles = Array.isArray(role) ? role : role ? [role] : [];
  if (roles.includes("student") && roles.length === 1) return "/student/login";
  return roles.includes("teacher") && !roles.includes("admin") ? "/teacher/login" : "/admin/login";
}

function dashboardPathForRole(role: AuthRole) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "teacher") return "/teacher/dashboard";
  return "/student/dashboard";
}

export function ProtectedRoute({ role }: ProtectedRouteProps) {
  const { hasRole, isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to={loginPathForRole(role)} replace state={{ from: location }} />;
  }

  if (role && !hasRole(role)) {
    return <Navigate to={dashboardPathForRole(user.role)} replace state={{ forbidden: true }} />;
  }

  return <Outlet />;
}
