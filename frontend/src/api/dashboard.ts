import { apiClient } from "./client";
import type { DashboardStats, TeacherDashboardStats } from "../types";

export async function getDashboardStats() {
  const { data } = await apiClient.get<DashboardStats>("/dashboard/admin");
  return data;
}

export async function getTeacherDashboardStats() {
  const { data } = await apiClient.get<TeacherDashboardStats>("/dashboard/teacher");
  return data;
}
