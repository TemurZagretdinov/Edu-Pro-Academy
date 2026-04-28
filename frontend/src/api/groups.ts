import { apiClient } from "./client";
import type { Group, GroupPayload, Student, StudentListItem, Teacher } from "../types";

export type GroupListParams = {
  q?: string;
  is_active?: boolean;
  skip?: number;
  limit?: number;
};

export async function getGroups(params?: GroupListParams) {
  const { data } = await apiClient.get<Group[]>("/groups", { params });
  return data;
}

export async function getGroup(id: number) {
  const { data } = await apiClient.get<Group>(`/groups/${id}`);
  return data;
}

export async function getUnassignedStudents(params?: { q?: string; is_active?: boolean; skip?: number; limit?: number }) {
  const { data } = await apiClient.get<StudentListItem[]>("/groups/unassigned-students", { params });
  return data;
}

export async function createGroup(payload: GroupPayload) {
  const { data } = await apiClient.post<Group>("/groups", payload);
  return data;
}

export async function updateGroup(id: number, payload: Partial<GroupPayload>) {
  const { data } = await apiClient.put<Group>(`/groups/${id}`, payload);
  return data;
}

export async function deleteGroup(id: number) {
  await apiClient.delete(`/groups/${id}`);
}

export async function setGroupActive(id: number, active: boolean) {
  const action = active ? "activate" : "deactivate";
  const { data } = await apiClient.patch<Group>(`/groups/${id}/${action}`);
  return data;
}

export async function assignTeacher(groupId: number, teacherId: number) {
  const { data } = await apiClient.put<Group>(`/groups/${groupId}/assign-teacher`, { teacher_id: teacherId });
  return data;
}

export async function removeTeacher(groupId: number, teacherId: number) {
  await apiClient.delete(`/groups/${groupId}/teachers/${teacherId}`);
}

export async function getGroupStudents(groupId: number) {
  const { data } = await apiClient.get<Student[]>(`/groups/${groupId}/students`);
  return data;
}

export async function addStudentsToGroup(groupId: number, studentIds: number[]) {
  const { data } = await apiClient.put<Group>(`/groups/${groupId}/add-students`, { student_ids: studentIds });
  return data;
}

export async function removeStudentFromGroup(groupId: number, studentId: number) {
  const { data } = await apiClient.put<Group>(`/groups/${groupId}/remove-student/${studentId}`);
  return data;
}

export async function getGroupTeachers(groupId: number) {
  const { data } = await apiClient.get<Teacher[]>(`/groups/${groupId}/teachers`);
  return data;
}
