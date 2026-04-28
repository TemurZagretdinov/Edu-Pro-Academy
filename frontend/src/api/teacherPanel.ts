import { apiClient } from "./client";
import type {
  Attendance,
  AttendanceBatchPayload,
  AttendancePayload,
  Group,
  Homework,
  HomeworkPayload,
  HomeworkStatus,
  HomeworkStatusPayload,
  LessonTime,
  Student,
  TeacherStudentProgress,
} from "../types";

export async function getMyGroups() {
  const { data } = await apiClient.get<Group[]>("/teacher/groups");
  return data;
}

export async function getMyGroup(id: number) {
  const { data } = await apiClient.get<Group>(`/teacher/groups/${id}`);
  return data;
}

export async function getMyGroupStudents(groupId: number) {
  const { data } = await apiClient.get<Student[]>(`/teacher/groups/${groupId}/students`);
  return data;
}

export async function getMyStudents(params?: { group_id?: number; q?: string; include_inactive?: boolean }) {
  const { data } = await apiClient.get<Student[]>("/teacher/students", { params });
  return data;
}

export async function getMyLessons(params?: { lesson_date?: string }) {
  const { data } = await apiClient.get<LessonTime[]>("/teacher/lessons", { params });
  return data;
}

export async function getMyAttendance(params?: { group_id?: number; attendance_date?: string; skip?: number; limit?: number }) {
  const { data } = await apiClient.get<Attendance[]>("/teacher/attendance", { params });
  return data;
}

export async function markMyAttendance(payload: AttendancePayload) {
  const { data } = await apiClient.post<Attendance>("/teacher/attendance", payload);
  return data;
}

export async function batchMarkMyAttendance(payload: AttendanceBatchPayload) {
  const { data } = await apiClient.post<Attendance[]>("/teacher/attendance/batch", payload);
  return data;
}

export async function createMyHomework(payload: HomeworkPayload) {
  const { data } = await apiClient.post<Homework>("/teacher/homework", payload);
  return data;
}

export async function getMyHomework(params?: { group_id?: number }) {
  const { data } = await apiClient.get<Homework[]>("/teacher/homework", { params });
  return data;
}

export async function markMyHomeworkStatus(payload: HomeworkStatusPayload) {
  const { data } = await apiClient.post<HomeworkStatus>("/teacher/homework/status", payload);
  return data;
}

export async function getMyHomeworkStatuses(params?: { homework_id?: number; student_id?: number }) {
  const { data } = await apiClient.get<HomeworkStatus[]>("/homework/status", { params });
  return data;
}

export async function getStudentProgress(studentId: number) {
  const { data } = await apiClient.get<TeacherStudentProgress>(`/teacher/students/${studentId}/progress`);
  return data;
}

export async function notifyMyStudentParent(
  studentId: number,
  payload: { type: "absent" | "late"; date?: string | null; note?: string | null },
) {
  const { data } = await apiClient.post<{ ok: boolean; sent_count: number; type: string; date: string }>(
    `/teacher/students/${studentId}/notify-parent`,
    payload,
  );
  return data;
}
