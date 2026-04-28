import { AlertTriangle, ShieldCheck, TrendingUp } from "lucide-react";

import { teacherRiskMeta, type TeacherRiskLevel } from "../../utils/teacherPanel";

export function TeacherRiskBadge({ level }: { level: TeacherRiskLevel }) {
  const meta = teacherRiskMeta(level);
  const Icon = level === "good" ? ShieldCheck : level === "medium" ? TrendingUp : AlertTriangle;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${meta.className}`}>
      <Icon size={13} />
      {meta.label}
    </span>
  );
}
