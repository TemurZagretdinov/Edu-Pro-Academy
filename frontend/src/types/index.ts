export type Passport = {
  id: number;
  firstname: string;
  lastname: string;
  seria: string;
  jshir: string;
  passport_number?: string | null;
  issued_by?: string | null;
  notes?: string | null;
  user_id: number;
};

export type Student = {
  id: number;
  firstname: string;
  lastname: string;
  phone_number: string;
  parent_phone_number?: string | null;
  email: string | null;
  birth_date?: string | null;
  gender?: string | null;
  address?: string | null;
  group_id: number | null;
  teacher_id?: number | null;
  registration_date?: string | null;
  is_active: boolean;
  comment?: string | null;
  trial_lesson_status?: string | null;
  user_id?: number | null;
  created_at: string;
  passport?: Passport | null;
};

export type StudentListItem = Pick<
  Student,
  | "id"
  | "firstname"
  | "lastname"
  | "phone_number"
  | "parent_phone_number"
  | "email"
  | "address"
  | "birth_date"
  | "gender"
  | "group_id"
  | "user_id"
  | "is_active"
  | "comment"
  | "registration_date"
  | "trial_lesson_status"
  | "created_at"
>;

export type Teacher = {
  id: number;
  name: string;
  email: string;
  phone_number: string;
  direction?: string | null;
  hire_date?: string | null;
  bio?: string | null;
  is_active?: boolean;
  groups_count?: number;
};

export type Group = {
  id: number;
  name: string;
  course_name?: string | null;
  level?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  lesson_days?: string | null;
  lesson_time?: string | null;
  room?: string | null;
  teacher_id?: number | null;
  is_active: boolean;
  created_at: string;
  teacher?: { id: number; full_name: string } | null;
  students_count: number;
  students: Array<Pick<Student, "id" | "firstname" | "lastname" | "phone_number" | "is_active">>;
  monthly_fee?: string | null;
};

export type Payment = {
  id: number;
  student_id: number;
  amount: string;
  is_cash: boolean;
  time_id: number | null;
  paid_for_month?: string | null;
  payment_date: string;
  status: string;
  note?: string | null;
  created_at: string;
};

export type AttendanceStatus = "present" | "came" | "absent" | "late" | "excused";

export type Attendance = {
  id: number;
  student_id: number;
  lesson_id: number | null;
  group_id?: number | null;
  teacher_id?: number | null;
  date?: string | null;
  status: AttendanceStatus;
  grade?: number | null;
  reason: string | null;
  note?: string | null;
  created_at: string;
};

export type LessonTime = {
  id: number;
  title: string;
  time_id: number | null;
  group_id: number | null;
  datetime: string;
  is_accepted: boolean;
};

export type LessonJournalStudent = Pick<Student, "id" | "firstname" | "lastname" | "phone_number" | "is_active">;

export type LessonJournalRow = {
  student: LessonJournalStudent;
  attendance_id: number | null;
  status: AttendanceStatus | null;
  grade: number | null;
  note: string | null;
  saved: boolean;
};

export type LessonJournalSaveItem = {
  student_id: number;
  status: AttendanceStatus;
  grade?: number | null;
  note?: string | null;
};

export type AttendanceBatchItem = {
  student_id: number;
  status: AttendanceStatus;
  grade?: number | null;
  reason?: string | null;
  note?: string | null;
};

export type AttendanceBatchPayload = {
  group_id: number;
  lesson_id?: number | null;
  date?: string | null;
  items: AttendanceBatchItem[];
};

export type TimeMonth = {
  id: number;
  datetime: string;
  price: string;
  group_id: number;
};

export type DashboardStats = {
  total_students: number;
  total_active_students: number;
  active_students: number;
  total_teachers: number;
  total_groups: number;
  active_groups: number;
  today_attendance: number;
  total_monthly_revenue: string;
  paid_on_time_students: number;
  on_time_payers: number;
  overdue_students: number;
  homework_completion_percent: number;
  homework_completion_rate: number;
  recent_payments: Payment[];
  attendance_summary: Array<{ status: string; count: number }>;
};

export type TeacherDashboardStats = {
  own_groups: number;
  total_students: number;
  todays_lessons: number;
  today_attendance_summary: Array<{ status: string; count: number }>;
  homework_completion_percent: number;
  recent_activity: string[];
};

export type Homework = {
  id: number;
  title: string;
  description: string | null;
  teacher_id: number;
  group_id: number;
  created_at: string;
  due_date: string | null;
  is_active: boolean;
};

export type HomeworkStatus = {
  id: number;
  homework_id: number;
  student_id: number;
  is_completed: boolean;
  submitted_at: string | null;
  note: string | null;
};

export type AuthRole = "admin" | "teacher" | "student";

export type UserProfile = {
  id: number;
  email: string;
  full_name: string;
  role: AuthRole;
  is_active: boolean;
  teacher_id: number | null;
  student_id: number | null;
  created_at: string;
};

export type AuthUser = {
  access_token: string;
  token_type: string;
  role: AuthRole;
  user_id: number;
  teacher_id: number | null;
  student_id: number | null;
  full_name: string;
  user: UserProfile;
};

export type StudentPayload = Omit<Student, "id" | "created_at" | "passport" | "user_id"> & {
  passport?: Omit<Passport, "id" | "user_id"> | null;
};

export type StudentCreatePayload = StudentPayload & { password?: string | null };

export type StudentSummary = {
  total_students: number;
  assigned_students: number;
  unassigned_students: number;
};

export type TeacherPayload = Omit<Teacher, "id"> & { password?: string | null };
export type GroupPayload = Omit<Group, "id" | "created_at" | "teacher" | "students_count" | "students">;
export type PaymentPayload = Omit<Payment, "id" | "created_at" | "amount" | "payment_date"> & {
  amount: number;
  payment_date?: string | null;
};
export type AttendancePayload = Omit<Attendance, "id" | "created_at">;
export type HomeworkPayload = Omit<Homework, "id" | "created_at" | "teacher_id"> & { teacher_id?: number | null };
export type HomeworkStatusPayload = Omit<HomeworkStatus, "id">;

export type StudentRecentNote = {
  source: "student" | "attendance" | "homework";
  title: string;
  note: string;
  created_at: string | null;
};

export type TeacherStudentProgress = {
  student: Student;
  attendance_percent: number;
  homework_percent: number;
  attendance_total: number;
  homework_total: number;
  recent_notes: StudentRecentNote[];
  can_notify_parent: boolean;
};

export type CreateTeacherUserPayload = {
  teacher_id: number;
  email?: string | null;
  full_name?: string | null;
  password: string;
};

export type StudentPortalProfile = {
  id: number;
  firstname: string;
  lastname: string;
  full_name: string;
  phone_number: string;
  parent_phone_number: string | null;
  email: string | null;
  address: string | null;
  birth_date: string | null;
  gender: string | null;
  group_id: number | null;
  group_name: string | null;
  teacher_id: number | null;
  teacher_name: string | null;
  is_active: boolean;
  created_at: string;
};

export type StudentAttendanceSummary = {
  present: number;
  absent: number;
  late: number;
};

export type StudentPaymentSummary = {
  total_paid: string;
  current_debt: string;
  monthly_fee: string;
  last_payment_date: string | null;
};

export type StudentHomeworkSummary = {
  total: number;
  completed: number;
  pending: number;
};

export type StudentDashboard = {
  student_name: string;
  group_name: string | null;
  teacher_name: string | null;
  attendance_summary: StudentAttendanceSummary;
  payment_summary: StudentPaymentSummary;
  homework_summary: StudentHomeworkSummary;
  next_lessons: StudentScheduleItem[];
};

export type StudentHomeworkItem = {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  group_id: number;
  teacher_id: number;
  is_completed: boolean;
  submitted_at: string | null;
  note: string | null;
};

export type StudentPortalPayments = {
  summary: StudentPaymentSummary;
  items: Payment[];
};

export type StudentPortalAttendance = {
  summary: StudentAttendanceSummary;
  items: Attendance[];
};

export type StudentScheduleItem = {
  id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  subject_name: string;
  room: string | null;
  teacher_name: string | null;
};

export type StudentPortalSchedule = {
  items: StudentScheduleItem[];
};

export type Parent = {
  id: number;
  full_name: string;
  phone_number: string | null;
  telegram_chat_id: string | null;
  telegram_user_id: string | null;
  is_connected: boolean;
  created_at: string;
};

export type ParentStudentLink = {
  id: number;
  parent_id: number;
  student_id: number;
  relation_type: string;
  is_primary: boolean;
  created_at: string;
  parent: Parent | null;
};

export type ParentConnectionCode = {
  student_id: number;
  code: string;
  relation_type: string;
  expires_at: string | null;
  is_used: boolean;
};

export type GroupSummary = {
  id: number;
  name: string;
  teacher_id: number | null;
  teacher_name: string | null;
  students_count: number;
  is_active: boolean;
};

export type ApplicationApprovePayload = {
  group_id?: number | null;
  generate_parent_code: boolean;
  relation_type: "mother" | "father" | "guardian";
  create_student_user?: boolean;
  email?: string | null;
  password?: string | null;
};

export type ApplicationApproveResponse = {
  student: Student;
  group: GroupSummary | null;
  parent_connection_code: ParentConnectionCode | null;
  parent_links: ParentStudentLink[];
  parent_connected: boolean;
  application_status: string | null;
  user_id: number | null;
  email: string | null;
  default_password: string | null;
  account_warning: string | null;
};

export type ParentLinkStatus = {
  student_id: number;
  parent_connected: boolean;
  parent_links: ParentStudentLink[];
  active_code: ParentConnectionCode | null;
};

export type Notification = {
  id: number;
  student_id: number;
  parent_id: number;
  type: string;
  title: string;
  message: string;
  is_sent: boolean;
  sent_at: string | null;
  created_at: string;
};
