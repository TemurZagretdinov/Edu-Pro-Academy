import { apiClient } from "./client";
import type { Teacher, TeacherPayload } from "../types";

export async function getTeachers() {
  const { data } = await apiClient.get<Teacher[]>("/teachers");
  return data;
}

export async function createTeacher(payload: TeacherPayload) {
  const { data } = await apiClient.post<Teacher>("/teachers", payload);
  return data;
}

export async function updateTeacher(id: number, payload: Partial<TeacherPayload>) {
  const { data } = await apiClient.put<Teacher>(`/teachers/${id}`, payload);
  return data;
}

export async function deleteTeacher(id: number) {
  await apiClient.delete(`/teachers/${id}`);
}
