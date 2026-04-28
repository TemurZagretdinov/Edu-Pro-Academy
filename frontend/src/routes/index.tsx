import { Navigate, createBrowserRouter } from "react-router-dom";

import { AdminLayout } from "../components/layout/AdminLayout";
import { PublicLayout } from "../components/layout/PublicLayout";
import { ProtectedRoute } from "../components/layout/ProtectedRoute";
import { StudentLayout } from "../components/layout/StudentLayout";
import { TeacherLayout } from "../components/layout/TeacherLayout";
import Login from "../pages/Login";
import NotFound from "../pages/NotFound";
import Attendance from "../pages/admin/Attendance";
import Applications from "../pages/admin/Applications";
import Dashboard from "../pages/admin/Dashboard";
import GroupDetail from "../pages/admin/GroupDetail";
import Groups from "../pages/admin/Groups";
import HomeworkAnalytics from "../pages/admin/HomeworkAnalytics";
import Payments from "../pages/admin/Payments";
import StudentDetail from "../pages/admin/StudentDetail";
import Students from "../pages/admin/Students";
import Teachers from "../pages/admin/Teachers";
import About from "../pages/public/About";
import Contact from "../pages/public/Contact";
import Home from "../pages/public/Home";
import Register from "../pages/public/Register";
import TeacherDashboard from "../pages/teacher/Dashboard";
import TeacherGroupDetail from "../pages/teacher/GroupDetail";
import StudentPortalAttendance from "../pages/student/Attendance";
import StudentPortalDashboard from "../pages/student/Dashboard";
import StudentPortalHomework from "../pages/student/Homework";
import StudentPortalPayments from "../pages/student/Payments";
import StudentPortalProfile from "../pages/student/Profile";
import StudentPortalSchedule from "../pages/student/Schedule";
import MyGroups from "../pages/teacher/MyGroups";
import MyStudents from "../pages/teacher/MyStudents";
import StudentProgress from "../pages/teacher/StudentProgress";
import TeacherAttendance from "../pages/teacher/TeacherAttendance";
import TeacherHomework from "../pages/teacher/TeacherHomework";
import TeacherSchedule from "../pages/teacher/TeacherSchedule";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Home /> },
      { path: "about", element: <About /> },
      { path: "contact", element: <Contact /> },
    ],
  },
  { path: "/register", element: <Register /> },
  { path: "/signup", element: <Register /> },
  { path: "/admin/login", element: <Login role="admin" /> },
  { path: "/teacher/login", element: <Login role="teacher" /> },
  { path: "/student/login", element: <Login role="student" /> },
  {
    path: "/admin",
    element: <ProtectedRoute role="admin" />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="/admin/dashboard" replace /> },
          { path: "dashboard", element: <Dashboard /> },
          { path: "students", element: <Students /> },
          { path: "students/:id", element: <StudentDetail /> },
          { path: "teachers", element: <Teachers /> },
          { path: "groups", element: <Groups /> },
          { path: "groups/:id", element: <GroupDetail /> },
          { path: "payments", element: <Payments /> },
          { path: "attendance", element: <Attendance /> },
          { path: "homework", element: <HomeworkAnalytics /> },
          { path: "applications", element: <Applications /> },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
  {
    path: "/teacher",
    element: <ProtectedRoute role="teacher" />,
    children: [
      {
        element: <TeacherLayout />,
        children: [
          { index: true, element: <Navigate to="/teacher/dashboard" replace /> },
          { path: "dashboard", element: <TeacherDashboard /> },
          { path: "groups", element: <MyGroups /> },
          { path: "groups/:id", element: <TeacherGroupDetail /> },
          { path: "students", element: <MyStudents /> },
          { path: "students/:id", element: <StudentProgress /> },
          { path: "attendance", element: <TeacherAttendance /> },
          { path: "schedule", element: <TeacherSchedule /> },
          { path: "homework", element: <TeacherHomework /> },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
  {
    path: "/student",
    element: <ProtectedRoute role="student" />,
    children: [
      {
        element: <StudentLayout />,
        children: [
          { index: true, element: <Navigate to="/student/dashboard" replace /> },
          { path: "dashboard", element: <StudentPortalDashboard /> },
          { path: "profile", element: <StudentPortalProfile /> },
          { path: "attendance", element: <StudentPortalAttendance /> },
          { path: "payments", element: <StudentPortalPayments /> },
          { path: "homework", element: <StudentPortalHomework /> },
          { path: "schedule", element: <StudentPortalSchedule /> },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
