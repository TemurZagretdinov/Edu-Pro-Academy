import { ArrowLeft, BookOpen, Award, Users, Calendar, Clock, Phone, User, CheckCircle, XCircle } from "lucide-react";
import { NavLink, useParams } from "react-router-dom";

import { getMyGroup } from "../../api/teacherPanel";
import { DataTable, type Column } from "../../components/tables/DataTable";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAsyncData } from "../../hooks/useAsyncData";
import type { Group } from "../../types";

type GroupStudent = Group["students"][number];

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('uz-UZ') : "-";
}

export default function TeacherGroupDetail() {
  const { id } = useParams();
  const groupId = Number(id);
  const group = useAsyncData(() => getMyGroup(groupId), [groupId]);

  const columns: Column<GroupStudent>[] = [
    {
      header: "Talaba",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-sm shadow-md">
            {row.firstname.charAt(0)}{row.lastname.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{row.firstname} {row.lastname}</p>
            <p className="text-xs text-gray-500">ID: {row.id}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Telefon",
      cell: (row) => (
        <a href={`tel:${row.phone_number}`} className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors">
          <Phone size={14} className="text-gray-400" />
          {row.phone_number}
        </a>
      ),
    },
    {
      header: "Holat",
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

  if (!Number.isFinite(groupId)) return <ErrorState message="Guruh ID noto'g'ri." />;
  if (group.loading) return <LoadingState />;
  if (group.error) return <ErrorState message={group.error} />;
  if (!group.data) return <ErrorState message="Guruh topilmadi." />;

  const currentGroup = group.data;

  // Guruh ma'lumotlari uchun kartalar
  const infoCards = [
    { label: "Kurs", value: currentGroup.course_name ?? "-", icon: BookOpen, color: "from-blue-500 to-cyan-500" },
    { label: "Daraja", value: currentGroup.level ?? "-", icon: Award, color: "from-purple-500 to-pink-500" },
    { label: "Talabalar", value: currentGroup.students_count, icon: Users, color: "from-emerald-500 to-cyan-500" },
    { label: "Dars kunlari", value: currentGroup.lesson_days ?? "-", icon: Calendar, color: "from-orange-500 to-red-500" },
    { label: "Dars vaqti", value: currentGroup.lesson_time ?? "-", icon: Clock, color: "from-indigo-500 to-blue-500" },
    { label: "Muddat", value: `${formatDate(currentGroup.start_date)} - ${formatDate(currentGroup.end_date)}`, icon: Calendar, color: "from-gray-500 to-gray-600" },
  ];

  return (
    <section className="space-y-6">
      {/* Back Button */}
      <NavLink 
        to="/teacher/groups" 
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition-colors hover:text-blue-600"
      >
        <ArrowLeft size={16} />
        Guruhlarga qaytish
      </NavLink>

      {/* Header Section */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="rounded-lg bg-white/20 p-2">
                <Users size={20} />
              </div>
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                Guruh tafsilotlari
              </span>
            </div>
            <h2 className="text-3xl font-bold">{currentGroup.name}</h2>
            <p className="mt-2 text-blue-100">Guruh ma'lumotlari va talabalar ro'yxati</p>
          </div>
          <StatusBadge 
            active={currentGroup.is_active} 
            trueLabel={
              <span className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-green-400" />
                Faol
              </span>
            } 
            falseLabel={
              <span className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-gray-400" />
                Nofaol
              </span>
            } 
          />
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {infoCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
              <div className="flex items-start gap-3">
                <div className={`inline-flex rounded-xl bg-gradient-to-br ${card.color} p-2.5 text-white shadow-md transition group-hover:scale-105`}>
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">{card.label}</p>
                  <p className="mt-1 font-semibold text-gray-900">{card.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Students Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Guruh talabalari</h3>
              <p className="text-sm text-gray-500">
                {currentGroup.students_count} ta talaba ro'yxatga olingan
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                {currentGroup.students_count} / {currentGroup.students.length}
              </div>
            </div>
          </div>
        </div>
        <DataTable 
          data={currentGroup.students} 
          columns={columns} 
          emptyLabel={
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-3 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">Bu guruhda talabalar yo'q</p>
              <p className="text-sm text-gray-400">Guruhga talabalar biriktirilmagan</p>
            </div>
          }
        />
      </div>
    </section>
  );
}
