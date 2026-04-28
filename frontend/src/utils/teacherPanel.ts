import type { Attendance, Group, HomeworkStatus, Student } from "../types";

export type TeacherRiskLevel = "good" | "medium" | "attention";

export type TeacherStudentInsight = {
  attendancePercent: number | null;
  homeworkPercent: number | null;
  attendanceTotal: number;
  homeworkTotal: number;
  parentMissing: boolean;
  needsAttention: boolean;
  riskLevel: TeacherRiskLevel;
  reasons: string[];
};

const dateFormatter = new Intl.DateTimeFormat("uz-UZ", {
  dateStyle: "medium",
});

const dateTimeFormatter = new Intl.DateTimeFormat("uz-UZ", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function teacherStudentName(student: Pick<Student, "firstname" | "lastname">) {
  return `${student.firstname} ${student.lastname}`.trim();
}

export function formatTeacherDate(value?: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "-";
}

export function formatTeacherDateTime(value?: string | null) {
  return value ? dateTimeFormatter.format(new Date(value)) : "-";
}

export function groupNameFromMap(groupId: number | null | undefined, groupsById: Map<number, Group>) {
  if (!groupId) return "Guruhsiz";
  return groupsById.get(groupId)?.name ?? `#${groupId}`;
}

export function resolveTeacherRisk(
  attendancePercent: number | null | undefined,
  homeworkPercent: number | null | undefined,
) {
  const metrics = [attendancePercent, homeworkPercent].filter((value): value is number => typeof value === "number");
  if (metrics.length === 0) return "medium" as TeacherRiskLevel;
  const lowest = Math.min(...metrics);
  if (lowest >= 80) return "good" as TeacherRiskLevel;
  if (lowest >= 60) return "medium" as TeacherRiskLevel;
  return "attention" as TeacherRiskLevel;
}

export function teacherRiskMeta(level: TeacherRiskLevel) {
  if (level === "good") {
    return {
      label: "Good",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }
  if (level === "medium") {
    return {
      label: "Medium",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }
  return {
    label: "Needs Attention",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  };
}

export function buildTeacherStudentInsights(
  students: Student[],
  attendance: Attendance[],
  homeworkStatuses: HomeworkStatus[],
) {
  const attendanceSummary = new Map<number, { total: number; positive: number }>();
  const homeworkSummary = new Map<number, { total: number; completed: number }>();

  for (const row of attendance) {
    const current = attendanceSummary.get(row.student_id) ?? { total: 0, positive: 0 };
    current.total += 1;
    if (row.status === "present" || row.status === "came" || row.status === "late") {
      current.positive += 1;
    }
    attendanceSummary.set(row.student_id, current);
  }

  for (const row of homeworkStatuses) {
    const current = homeworkSummary.get(row.student_id) ?? { total: 0, completed: 0 };
    current.total += 1;
    if (row.is_completed) current.completed += 1;
    homeworkSummary.set(row.student_id, current);
  }

  const result = new Map<number, TeacherStudentInsight>();
  for (const student of students) {
    const attendanceInfo = attendanceSummary.get(student.id);
    const homeworkInfo = homeworkSummary.get(student.id);
    const attendancePercent =
      attendanceInfo && attendanceInfo.total > 0 ? Number(((attendanceInfo.positive / attendanceInfo.total) * 100).toFixed(1)) : null;
    const homeworkPercent =
      homeworkInfo && homeworkInfo.total > 0 ? Number(((homeworkInfo.completed / homeworkInfo.total) * 100).toFixed(1)) : null;
    const parentMissing = !student.parent_phone_number;
    const reasons: string[] = [];

    if (parentMissing) reasons.push("Ota-ona raqami yo'q");
    if (attendancePercent !== null && attendancePercent < 70) reasons.push("Davomat past");
    if (homeworkPercent !== null && homeworkPercent < 60) reasons.push("Vazifa bajarilishi past");
    if (!student.is_active) reasons.push("Nofaol");

    const riskLevel = resolveTeacherRisk(attendancePercent, homeworkPercent);
    result.set(student.id, {
      attendancePercent,
      homeworkPercent,
      attendanceTotal: attendanceInfo?.total ?? 0,
      homeworkTotal: homeworkInfo?.total ?? 0,
      parentMissing,
      needsAttention: reasons.length > 0 || riskLevel === "attention",
      riskLevel,
      reasons,
    });
  }

  return result;
}
