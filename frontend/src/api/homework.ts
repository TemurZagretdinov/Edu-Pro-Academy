import { apiClient } from "./client";
import type { Homework, HomeworkPayload, HomeworkStatus, HomeworkStatusPayload } from "../types";

export async function getHomework(params?: { group_id?: number; is_active?: boolean }) {
  const { data } = await apiClient.get<Homework[]>("/homework", { params });
  return data;
}

export async function createHomework(payload: HomeworkPayload) {
  const { data } = await apiClient.post<Homework>("/homework", payload);
  return data;
}

export async function markHomeworkStatus(payload: HomeworkStatusPayload) {
  const { data } = await apiClient.post<HomeworkStatus>("/homework/status", payload);
  return data;
}

export async function getHomeworkStatuses(params?: { homework_id?: number; student_id?: number }) {
  const { data } = await apiClient.get<HomeworkStatus[]>("/homework/status", { params });
  return data;
}

export async function getHomeworkAnalytics() {
  const { data } = await apiClient.get<{ total: number; completed: number; completion_percent: number }>("/homework/analytics");
  return data;
}
