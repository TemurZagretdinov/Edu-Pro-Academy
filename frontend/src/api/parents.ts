import { apiClient } from "./client";
import type { Notification, ParentConnectionCode, ParentLinkStatus, ParentStudentLink } from "../types";

export async function generateParentCode(studentId: number) {
  const { data } = await apiClient.post<ParentConnectionCode>(`/students/${studentId}/generate-parent-code`);
  return data;
}

export async function getStudentParents(studentId: number) {
  const { data } = await apiClient.get<ParentStudentLink[]>(`/students/${studentId}/parents`);
  return data;
}

export async function getParentLinkStatus(studentId: number) {
  const { data } = await apiClient.get<ParentLinkStatus>(`/students/${studentId}/parent-link-status`);
  return data;
}

export async function sendTestNotification(studentId: number) {
  const { data } = await apiClient.post<Notification[]>("/notifications/test-send", {
    student_id: studentId,
    type: "announcement",
    title: "Test bildirishnoma",
    message: "Bu test bildirishnoma. Telegram ulanishi ishlayapti.",
  });
  return data;
}
