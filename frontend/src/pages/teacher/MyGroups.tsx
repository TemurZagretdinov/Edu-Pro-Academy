import { NavLink } from "react-router-dom";
import { Users, BookOpen, Calendar, Clock, Award, ChevronRight, TrendingUp } from "lucide-react";

import { getMyGroups } from "../../api/teacherPanel";
import { DataTable, type Column } from "../../components/tables/DataTable";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAsyncData } from "../../hooks/useAsyncData";
import type { Group } from "../../types";

export default function MyGroups() {
  const groups = useAsyncData(getMyGroups, []);

  if (groups.loading) return <LoadingState />;
  if (groups.error) return <ErrorState message={groups.error} />;

  const groupsData = groups.data ?? [];
  const activeGroups = groupsData.filter(g => g.is_active).length;
  const totalStudents = groupsData.reduce((sum, g) => sum + g.students_count, 0);

  const columns: Column<Group>[] = [
    {
      header: "Guruh",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md">
            <Users size={18} />
          </div>
          <div>
            <NavLink 
              className="font-bold text-gray-900 hover:text-blue-600 transition-colors" 
              to={`/teacher/groups/${row.id}`}
            >
              {row.name}
            </NavLink>
            <p className="text-xs text-gray-500">ID: {row.id}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Kurs",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-gray-400" />
          <span className="text-gray-700">{row.course_name ?? "-"}</span>
        </div>
      ),
    },
    {
      header: "Daraja",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Award size={14} className="text-gray-400" />
          <span className="text-gray-700">{row.level ?? "-"}</span>
        </div>
      ),
    },
    {
      header: "Talabalar",
      cell: (row) => (
        <div className="inline-flex items-center justify-center rounded-full bg-blue-100 px-3 py-1">
          <span className="text-sm font-semibold text-blue-700">{row.students_count}</span>
        </div>
      ),
    },
    {
      header: "Dars kunlari",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-gray-400" />
          <span className="text-gray-700">{row.lesson_days ?? "-"}</span>
        </div>
      ),
    },
    {
      header: "Dars vaqti",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-gray-400" />
          <span className="text-gray-700">{row.lesson_time ?? "-"}</span>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (row) => (
        <StatusBadge 
          active={row.is_active} 
          trueLabel={
            <span className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Faol
            </span>
          } 
          falseLabel={
            <span className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
              Nofaol
            </span>
          } 
        />
      ),
    },
  ];

  return (
    <section className="space-y-6">
      {/* Header Section */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="rounded-lg bg-white/20 p-2">
                <Users size={20} />
              </div>
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                O'qituvchi paneli
              </span>
            </div>
            <h2 className="text-3xl font-bold">Mening guruhlarim</h2>
            <p className="mt-2 text-blue-100">
              Sizga biriktirilgan guruhlar ro'yxati
            </p>
          </div>
          <div className="hidden md:block">
            <div className="rounded-xl bg-white/10 p-4 text-center backdrop-blur-sm">
              <div className="text-2xl font-bold">{groupsData.length}</div>
              <div className="text-sm text-blue-100">Jami guruhlar</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Jami guruhlar</p>
              <p className="text-2xl font-bold text-gray-900">{groupsData.length}</p>
            </div>
            <div className="rounded-lg bg-blue-100 p-2">
              <Users size={20} className="text-blue-600" />
            </div>
          </div>
          <div className="mt-3 h-1 w-full rounded-full bg-gray-100">
            <div className="h-full w-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, groupsData.length * 20)}%` }} />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Faol guruhlar</p>
              <p className="text-2xl font-bold text-green-600">{activeGroups}</p>
            </div>
            <div className="rounded-lg bg-green-100 p-2">
              <TrendingUp size={20} className="text-green-600" />
            </div>
          </div>
          <div className="mt-3 h-1 w-full rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-green-500" style={{ width: `${groupsData.length ? (activeGroups / groupsData.length) * 100 : 0}%` }} />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Jami talabalar</p>
              <p className="text-2xl font-bold text-purple-600">{totalStudents}</p>
            </div>
            <div className="rounded-lg bg-purple-100 p-2">
              <BookOpen size={20} className="text-purple-600" />
            </div>
          </div>
          <div className="mt-3 h-1 w-full rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-purple-500" style={{ width: `${Math.min(100, totalStudents / 5)}%` }} />
          </div>
        </div>
      </div>

      {/* Groups Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Guruhlar ro'yxati</h3>
              <p className="text-sm text-gray-500">
                Siz mas'ul bo'lgan barcha guruhlar
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ChevronRight size={16} className="text-gray-400" />
              <span className="text-xs text-gray-500">Guruh ustiga bosing</span>
            </div>
          </div>
        </div>
        <DataTable 
          data={groupsData} 
          columns={columns} 
          emptyLabel={
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-3 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">Sizga biriktirilgan guruhlar yo'q</p>
              <p className="text-sm text-gray-400">Admin sizni guruhga biriktirgandan so'ng bu yerda ko'rinadi</p>
            </div>
          }
        />
      </div>
    </section>
  );
}