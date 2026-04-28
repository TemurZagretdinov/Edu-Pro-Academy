import { apiClient } from "./client";
import type { AuthUser, CreateTeacherUserPayload, UserProfile } from "../types";

export type LoginPayload = {
  email: string;
  password: string;
};

export async function login(payload: LoginPayload) {
  const { data } = await apiClient.post<AuthUser>(
    "/auth/login",
    {
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
    },
    {
      headers: { "Content-Type": "application/json" },
    },
  );
  return data;
}

export async function bootstrapAdmin() {
  const { data } = await apiClient.post("/auth/bootstrap-admin");
  return data;
}

export async function getMe() {
  const { data } = await apiClient.get<UserProfile>("/auth/me");
  return data;
}

export async function createTeacherUser(payload: CreateTeacherUserPayload) {
  const { data } = await apiClient.post<UserProfile>("/auth/create-teacher-user", payload);
  return data;
}

export async function changePassword(payload: { current_password: string; new_password: string }) {
  const { data } = await apiClient.post<{ message: string }>("/auth/change-password", payload);
  return data;
}
