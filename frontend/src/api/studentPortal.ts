import { apiClient } from "./client";
import type {
  StudentDashboard,
  StudentHomeworkItem,
  StudentPortalAttendance,
  StudentPortalPayments,
  StudentPortalProfile,
  StudentPortalSchedule,
} from "../types";

export async function getStudentDashboard() {
  const { data } = await apiClient.get<StudentDashboard>("/student/dashboard");
  return data;
}

export async function getStudentProfile() {
  const { data } = await apiClient.get<StudentPortalProfile>("/student/profile");
  return data;
}

export async function getStudentPortalAttendance() {
  const { data } = await apiClient.get<StudentPortalAttendance>("/student/attendance");
  return data;
}

export async function getStudentPortalPayments() {
  const { data } = await apiClient.get<StudentPortalPayments>("/student/payments");
  return data;
}

export async function getStudentPortalHomework() {
  const { data } = await apiClient.get<StudentHomeworkItem[]>("/student/homework");
  return data;
}

export async function getStudentPortalSchedule() {
  const { data } = await apiClient.get<StudentPortalSchedule>("/student/schedule");
  return data;
}
