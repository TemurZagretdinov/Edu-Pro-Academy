import { apiClient } from "./client";
import type { Attendance, AttendancePayload, LessonJournalRow, LessonJournalSaveItem, LessonTime, TimeMonth } from "../types";

export async function getAttendance() {
  const { data } = await apiClient.get<Attendance[]>("/attendance");
  return data;
}

export async function markAttendance(payload: AttendancePayload) {
  const { data } = await apiClient.post<Attendance>("/attendance", payload);
  return data;
}

export async function updateAttendance(id: number, payload: Partial<AttendancePayload>) {
  const { data } = await apiClient.put<Attendance>(`/attendance/${id}`, payload);
  return data;
}

export async function getLessons(params?: { group_id?: number; time_id?: number; skip?: number; limit?: number }) {
  const { data } = await apiClient.get<LessonTime[]>("/lessons", { params });
  return data;
}

export async function createLesson(payload: Omit<LessonTime, "id">) {
  const { data } = await apiClient.post<LessonTime>("/lessons", payload);
  return data;
}

export async function getLessonMonths(params?: { group_id?: number; skip?: number; limit?: number }) {
  const { data } = await apiClient.get<TimeMonth[]>("/lessons/months", { params });
  return data;
}

export async function createLessonMonth(payload: Omit<TimeMonth, "id">) {
  const { data } = await apiClient.post<TimeMonth>("/lessons/months", payload);
  return data;
}

export async function getLessonJournal(lessonId: number) {
  const { data } = await apiClient.get<LessonJournalRow[]>(`/lessons/${lessonId}/journal`);
  return data;
}

export async function saveLessonJournalBatch(lessonId: number, rows: LessonJournalSaveItem[]) {
  const { data } = await apiClient.put<LessonJournalRow[]>(`/lessons/${lessonId}/journal/batch`, { rows });
  return data;
}
