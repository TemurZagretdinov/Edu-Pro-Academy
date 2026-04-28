import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { getMe, login as loginRequest } from "../api/auth";
import type { AuthRole, AuthUser, UserProfile } from "../types";

type AuthContextValue = {
  user: AuthUser | null;
  profile: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  refreshUser: () => Promise<UserProfile | null>;
  hasRole: (role: AuthRole | AuthRole[]) => boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem("auth_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    localStorage.removeItem("auth_user");
    localStorage.removeItem("access_token");
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser);
  const token = localStorage.getItem("access_token");

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("auth_user");
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem("access_token")) return null;
    try {
      const profile = await getMe();
      setUser((current) => {
        if (!current) return current;
        const next = {
          ...current,
          role: profile.role,
          user_id: profile.id,
          teacher_id: profile.teacher_id,
          student_id: profile.student_id,
          full_name: profile.full_name,
          user: profile,
        };
        localStorage.setItem("auth_user", JSON.stringify(next));
        return next;
      });
      return profile;
    } catch {
      logout();
      return null;
    }
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile: user?.user ?? null,
      token,
      isAuthenticated: Boolean(user && token),
      isAdmin: user?.role === "admin",
      isTeacher: user?.role === "teacher",
      isStudent: user?.role === "student",
      async login(email: string, password: string) {
        const authenticated = await loginRequest({ email, password });
        localStorage.setItem("access_token", authenticated.access_token);
        localStorage.setItem("auth_user", JSON.stringify(authenticated));
        setUser(authenticated);
        return authenticated;
      },
      refreshUser,
      hasRole(role: AuthRole | AuthRole[]) {
        const allowedRoles = Array.isArray(role) ? role : [role];
        return Boolean(user && allowedRoles.includes(user.role));
      },
      logout,
    }),
    [logout, refreshUser, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
