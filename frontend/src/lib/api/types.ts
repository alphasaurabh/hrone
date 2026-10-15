export type AttendanceStatus = "PRESENT" | "WFH" | "ON_DUTY" | "ABSENT" | "LEAVE";
export type PresenceStatus = "PRESENT" | "WFH" | "ON_DUTY";

export type Employee = {
  emp_code: string;
  name: string;
  email: string;
  department: string;
  shift_start: string;
  shift_end: string;
  joined_on: string;
  created_at: number;
};

export type EmployeeCreate = Omit<Employee, "created_at">;

export type HistoryChange = { from: string | number | null; to: string | number | null };
export type HistoryEntry = {
  at: number;
  by: string;
  reason: string;
  changes: Record<string, HistoryChange>;
};

export type AttendanceRecord = {
  emp_code: string;
  date: string;
  status: AttendanceStatus;
  punch_in: number | null;
  punch_out: number | null;
  work_hours: number | null;
  late_minutes: number;
  overtime_minutes: number;
  half_day: boolean;
  history: HistoryEntry[];
};

export type Page<T> = { items: T[]; total: number; page: number; page_size: number };
export type AttendanceFilters = {
  emp_code?: string;
  date_from?: string;
  date_to?: string;
  status?: AttendanceStatus;
  page?: number;
  page_size?: number;
};
export type RegularizeRequest = {
  status?: AttendanceStatus;
  punch_in?: number;
  punch_out?: number;
  reason: string;
  regularized_by: string;
};

export type EmployeeMonthly = {
  emp_code: string;
  month: string;
  working_days: number;
  present_days: number;
  leave_days: number;
  late_count: number;
  total_late_minutes: number;
  total_overtime_minutes: number;
  attendance_pct: number | null;
};

export type DepartmentSummaryItem = {
  department: string;
  headcount: number;
  present_days: number;
  avg_work_hours: number | null;
  late_count: number;
  total_late_minutes: number;
  leave_count: number;
  on_duty_count: number;
};

export type DepartmentSummary = {
  month: string;
  items: DepartmentSummaryItem[];
};

export type LeaderboardItem = {
  rank: number;
  emp_code: string;
  name: string;
  department: string;
  total_late_minutes: number;
  late_count: number;
};

export type Leaderboard = {
  month: string;
  items: LeaderboardItem[];
};

export type TrendItem = {
  date: string;
  is_working_day: boolean;
  headcount: number;
  present_count: number;
  late_count: number;
  attendance_rate: number | null;
  moving_avg_7d: number | null;
};

export type DepartmentTrend = {
  department: string;
  items: TrendItem[];
};

export type ExplainEndpoint = {
  endpoint: string;
  collection: string;
  explain: Record<string, unknown>;
};

export type ExplainEndpointName =
  | "attendance_list"
  | "employee_monthly"
  | "department_summary"
  | "late_leaderboard"
  | "department_trend";
