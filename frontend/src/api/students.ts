import { apiClient } from "./client";
import type { ApplicationApprovePayload, ApplicationApproveResponse, Attendance, Payment, Student, StudentCreatePayload, StudentListItem, StudentPayload, StudentSummary } from "../types";

export type StudentListParams = {
  q?: string;
  group_id?: number;
  is_active?: boolean;
  skip?: number;
  limit?: number;
};

export async function getStudents(params?: StudentListParams) {
  const { data } = await apiClient.get<StudentListItem[]>("/students", { params });
  return data;
}

export async function getStudent(id: number) {
  const { data } = await apiClient.get<Student>(`/students/${id}`);
  return data;
}

export async function createStudent(payload: StudentCreatePayload) {
  const { data } = await apiClient.post<Student>("/students", payload);
  return data;
}

export async function getStudentSummary() {
  const { data } = await apiClient.get<StudentSummary>("/students/summary");
  return data;
}

export async function registerStudent(payload: StudentPayload) {
  const { data } = await apiClient.post<Student>("/students/register", payload);
  return data;
}

export async function updateStudent(id: number, payload: Partial<StudentPayload>) {
  const { data } = await apiClient.put<Student>(`/students/${id}`, payload);
  return data;
}

export async function deleteStudent(id: number) {
  await apiClient.delete(`/students/${id}`);
}

export async function approveStudent(id: number, payload: { password: string; email?: string | null }) {
  const { data } = await apiClient.post<ApplicationApproveResponse>(`/students/${id}/approve`, payload);
  return data;
}

export async function approveApplication(id: number, payload: ApplicationApprovePayload) {
  const { data } = await apiClient.post<ApplicationApproveResponse>(`/students/applications/${id}/approve`, payload);
  return data;
}

export async function rejectApplication(id: number, reason?: string | null) {
  const { data } = await apiClient.post<Student>(`/students/applications/${id}/reject`, { reason });
  return data;
}

export async function getStudentPayments(id: number) {
  const { data } = await apiClient.get<Payment[]>(`/students/${id}/payments`);
  return data;
}

export async function getStudentAttendance(id: number) {
  const { data } = await apiClient.get<Attendance[]>(`/students/${id}/attendance`);
  return data;
}
