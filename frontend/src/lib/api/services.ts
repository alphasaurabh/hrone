import { recentAttendanceDemo } from "../../features/dashboard/demoData";
import type { AttendanceFilters, AttendanceRecord, AttendanceStatus, DepartmentSummary, DepartmentTrend, Employee, EmployeeCreate, EmployeeMonthly, ExplainEndpoint, ExplainEndpointName, Leaderboard, Page, PresenceStatus, RegularizeRequest } from "./types";
import { apiRequest } from "./client";

export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== "false";

const mockEmployees: Employee[] = [
  { emp_code: "EMP0001", name: "Asha Rao", email: "asha@example.com", department: "Engineering", shift_start: "09:30", shift_end: "18:30", joined_on: "2026-01-05", created_at: 1767587400000 },
  { emp_code: "EMP0002", name: "Vikram Shah", email: "vikram@example.com", department: "Engineering", shift_start: "09:30", shift_end: "18:30", joined_on: "2026-07-13", created_at: 1780000000000 },
  { emp_code: "EMP0003", name: "Neha Iyer", email: "neha@example.com", department: "Sales", shift_start: "09:30", shift_end: "18:30", joined_on: "2026-02-01", created_at: 1769920200000 },
  { emp_code: "EMP0004", name: "Rohit Das", email: "rohit@example.com", department: "Sales", shift_start: "09:30", shift_end: "18:30", joined_on: "2026-02-01", created_at: 1769920260000 },
  { emp_code: "EMP0005", name: "Meera Nair", email: "meera@example.com", department: "Support", shift_start: "22:00", shift_end: "06:00", joined_on: "2026-03-10", created_at: 1773117000000 },
  { emp_code: "EMP0006", name: "Karan Bedi", email: "karan@example.com", department: "Support", shift_start: "09:30", shift_end: "18:30", joined_on: "2026-03-10", created_at: 1773117060000 },
];

let mockAttendance: AttendanceRecord[] = recentAttendanceDemo.map((record) => ({
  emp_code: record.emp_code,
  date: record.date,
  status: record.status,
  punch_in: record.punch_in ? Date.parse(`${record.date}T${record.punch_in}:00+05:30`) : null,
  punch_out: record.punch_out ? Date.parse(`${record.date}T${record.punch_out}:00+05:30`) : null,
  work_hours: record.work_hours,
  late_minutes: record.late_minutes,
  overtime_minutes: 0,
  half_day: record.work_hours !== null && record.work_hours < 4.5,
  history: [],
}));

const mockDepartments = [...new Set(mockEmployees.map((employee) => employee.department))];
const isPresent = (status: AttendanceStatus) => status === "PRESENT" || status === "WFH" || status === "ON_DUTY";
const istDateFor = (instant: number) => new Date(instant + 330 * 60 * 1000).toISOString().slice(0, 10);
const isValidMonth = (month: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
const monthRecords = (month: string) => mockAttendance.filter((record) => record.date.startsWith(month));
function workingDays(month: string, joinedOn?: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return Array.from({ length: days }, (_, index) => {
    const date = `${month}-${String(index + 1).padStart(2, "0")}`;
    return date >= (joinedOn ?? `${month}-01`) ? new Date(Date.UTC(year, monthNumber - 1, index + 1)).getUTCDay() : -1;
  }).filter((day) => day > 0 && day < 6).length;
}

export async function healthCheck(): Promise<{ status: "ok" }> {
  return USE_MOCKS ? { status: "ok" } : apiRequest<{ status: "ok" }>("/health");
}

export async function listEmployees(params: { department?: string; page?: number; page_size?: number } = {}): Promise<Page<Employee>> {
  if (!USE_MOCKS) {
    const search = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined) as [string, string][]).toString();
    return apiRequest<Page<Employee>>(`/employees${search ? `?${search}` : ""}`);
  }
  const filtered = mockEmployees.filter((employee) => !params.department || employee.department === params.department);
  const page = params.page ?? 1;
  const pageSize = params.page_size ?? 20;
  return { items: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, page_size: pageSize };
}

export async function createEmployee(body: EmployeeCreate): Promise<Employee> {
  if (!USE_MOCKS) return apiRequest<Employee>("/employees", { method: "POST", body: JSON.stringify(body) });
  if (mockEmployees.some((employee) => employee.emp_code === body.emp_code)) throw new Error("emp_code already exists");
  const created = { ...body, created_at: Date.now() };
  mockEmployees.push(created);
  return created;
}

export async function listAttendance(filters: AttendanceFilters = {}): Promise<Page<AttendanceRecord>> {
  if (!USE_MOCKS) {
    const search = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== undefined) as [string, string][]).toString();
    return apiRequest<Page<AttendanceRecord>>(`/attendance${search ? `?${search}` : ""}`);
  }
  const filtered = mockAttendance.filter((record) =>
    (!filters.emp_code || record.emp_code.toLowerCase().includes(filters.emp_code.toLowerCase())) &&
    (!filters.date_from || record.date >= filters.date_from) &&
    (!filters.date_to || record.date <= filters.date_to) &&
    (!filters.status || record.status === filters.status),
  );
  const page = filters.page ?? 1;
  const pageSize = filters.page_size ?? 20;
  return { items: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, page_size: pageSize };
}

export async function punchIn(emp_code: string, status: PresenceStatus, punched_at = Date.now()): Promise<AttendanceRecord> {
  if (!USE_MOCKS) return apiRequest<AttendanceRecord>("/attendance/punch-in", { method: "POST", body: JSON.stringify({ emp_code, status, punched_at }) });
  const employee = mockEmployees.find((item) => item.emp_code === emp_code);
  if (!employee) throw new Error("Unknown employee");
  const date = istDateFor(punched_at);
  if (mockAttendance.some((item) => item.emp_code === emp_code && item.date === date)) throw new Error("already punched in for this date");
  const record: AttendanceRecord = { emp_code, date, status, punch_in: punched_at, punch_out: null, work_hours: null, late_minutes: 0, overtime_minutes: 0, half_day: false, history: [] };
  mockAttendance = [record, ...mockAttendance];
  return record;
}

export async function punchOut(emp_code: string, punched_at = Date.now()): Promise<AttendanceRecord> {
  if (!USE_MOCKS) return apiRequest<AttendanceRecord>("/attendance/punch-out", { method: "POST", body: JSON.stringify({ emp_code, punched_at }) });
  const index = mockAttendance.findIndex((item) => item.emp_code === emp_code && item.punch_in !== null && item.punch_out === null);
  if (index < 0) throw new Error("No open punch-in found");
  const current = mockAttendance[index];
  const workHours = Math.round(((punched_at - current.punch_in!) / 3600000) * 100) / 100;
  const updated = { ...current, punch_out: punched_at, work_hours: workHours, half_day: workHours < 4.5 };
  mockAttendance = mockAttendance.map((item, itemIndex) => itemIndex === index ? updated : item);
  return updated;
}

export async function regularizeAttendance(emp_code: string, date: string, body: RegularizeRequest): Promise<AttendanceRecord> {
  if (!USE_MOCKS) return apiRequest<AttendanceRecord>(`/attendance/${encodeURIComponent(emp_code)}/${encodeURIComponent(date)}`, { method: "PATCH", body: JSON.stringify(body) });
  const index = mockAttendance.findIndex((item) => item.emp_code === emp_code && item.date === date);
  if (index < 0) throw new Error("Attendance record not found");
  const current = mockAttendance[index];
  const updated = { ...current, ...(body.status ? { status: body.status } : {}), ...(body.punch_in ? { punch_in: body.punch_in } : {}), ...(body.punch_out ? { punch_out: body.punch_out } : {}) };
  const changes: Record<string, { from: string | number | null; to: string | number | null }> = {};
  if (body.status && body.status !== current.status) changes.status = { from: current.status, to: body.status };
  if (body.punch_in !== undefined && body.punch_in !== current.punch_in) changes.punch_in = { from: current.punch_in, to: body.punch_in };
  if (body.punch_out !== undefined && body.punch_out !== current.punch_out) changes.punch_out = { from: current.punch_out, to: body.punch_out };
  const history = { at: Date.now(), by: body.regularized_by, reason: body.reason, changes };
  const result = { ...updated, history: [...current.history, history] };
  mockAttendance = mockAttendance.map((item, itemIndex) => itemIndex === index ? result : item);
  return result;
}

export async function getEmployeeMonthly(emp_code: string, month: string): Promise<EmployeeMonthly> {
  if (!USE_MOCKS) return apiRequest<EmployeeMonthly>(`/analytics/employees/${encodeURIComponent(emp_code)}/monthly?month=${encodeURIComponent(month)}`);
  if (!isValidMonth(month)) throw new Error("Month must use YYYY-MM format.");
  const employee = mockEmployees.find((item) => item.emp_code === emp_code);
  if (!employee) throw new Error("Employee not found.");
  const records = monthRecords(month).filter((record) => record.emp_code === emp_code);
  const presentDays = records.filter((record) => isPresent(record.status) && new Date(`${record.date}T00:00:00`).getDay() > 0 && new Date(`${record.date}T00:00:00`).getDay() < 6).reduce((sum, record) => sum + (record.half_day ? 0.5 : 1), 0);
  const working = workingDays(month, employee.joined_on);
  return {
    emp_code,
    month,
    working_days: working,
    present_days: presentDays,
    leave_days: records.filter((record) => record.status === "LEAVE").length,
    late_count: records.filter((record) => record.late_minutes > 0).length,
    total_late_minutes: records.reduce((sum, record) => sum + record.late_minutes, 0),
    total_overtime_minutes: records.reduce((sum, record) => sum + record.overtime_minutes, 0),
    attendance_pct: working ? Math.round((presentDays / working) * 10000) / 100 : null,
  };
}

export async function getDepartmentSummary(month: string, department?: string): Promise<DepartmentSummary> {
  if (!USE_MOCKS) {
    const params = new URLSearchParams({ month });
    if (department) params.set("department", department);
    return apiRequest<DepartmentSummary>(`/analytics/departments/summary?${params}`);
  }
  if (!isValidMonth(month)) throw new Error("Month must use YYYY-MM format.");
  const departments = department ? mockDepartments.filter((item) => item === department) : mockDepartments;
  return {
    month,
    items: departments.map((item) => {
      const people = mockEmployees.filter((employee) => employee.department === item);
      const records = monthRecords(month).filter((record) => people.some((employee) => employee.emp_code === record.emp_code));
      const presentDays = records.filter((record) => isPresent(record.status)).reduce((sum, record) => sum + (record.half_day ? 0.5 : 1), 0);
      const hours = records.flatMap((record) => record.work_hours === null ? [] : [record.work_hours]);
      return {
        department: item,
        headcount: people.length,
        present_days: presentDays,
        avg_work_hours: hours.length ? Math.round((hours.reduce((sum, value) => sum + value, 0) / hours.length) * 100) / 100 : null,
        late_count: records.filter((record) => record.late_minutes > 0).length,
        total_late_minutes: records.reduce((sum, record) => sum + record.late_minutes, 0),
        leave_count: records.filter((record) => record.status === "LEAVE").length,
        on_duty_count: records.filter((record) => record.status === "ON_DUTY").length,
      };
    }),
  };
}

export async function getLateLeaderboard(month: string, limit = 10, department?: string): Promise<Leaderboard> {
  if (!USE_MOCKS) {
    const params = new URLSearchParams({ month, limit: String(limit) });
    if (department) params.set("department", department);
    return apiRequest<Leaderboard>(`/analytics/leaderboard/late?${params}`);
  }
  if (!isValidMonth(month) || !Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error("Month or leaderboard limit is invalid.");
  const totals = mockEmployees.map((employee) => {
    const records = monthRecords(month).filter((record) => record.emp_code === employee.emp_code);
    return { emp_code: employee.emp_code, name: employee.name, department: employee.department, total_late_minutes: records.reduce((sum, record) => sum + record.late_minutes, 0), late_count: records.filter((record) => record.late_minutes > 0).length };
  }).filter((item) => item.total_late_minutes > 0 && (!department || item.department === department)).sort((a, b) => b.total_late_minutes - a.total_late_minutes || a.emp_code.localeCompare(b.emp_code));
  const ranked = totals.map((item, index) => ({ ...item, rank: index > 0 && item.total_late_minutes === totals[index - 1].total_late_minutes ? 0 : index + 1 })).map((item, index, all) => item.rank === 0 ? { ...item, rank: all[index - 1].rank } : item);
  return { month, items: ranked.filter((item) => item.rank <= limit) };
}

export async function getDepartmentTrend(department: string, from: string, to: string): Promise<DepartmentTrend> {
  if (!USE_MOCKS) return apiRequest<DepartmentTrend>(`/analytics/departments/${encodeURIComponent(department)}/trend?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  const rangeDays = Math.floor((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86400000) + 1;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to || rangeDays > 92) throw new Error("Trend range must be ordered and no longer than 92 days.");
  const people = mockEmployees.filter((employee) => employee.department === department);
  if (!people.length) throw new Error("Department not found.");
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  const items: DepartmentTrend["items"] = [];
  for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const date = cursor.toISOString().slice(0, 10);
    const day = cursor.getUTCDay();
    const records = mockAttendance.filter((record) => record.date === date && people.some((employee) => employee.emp_code === record.emp_code));
    const headcount = people.filter((employee) => employee.joined_on <= date).length;
    const presentCount = records.filter((record) => isPresent(record.status)).reduce((sum, record) => sum + (record.half_day ? 0.5 : 1), 0);
    const rate = day > 0 && day < 6 && headcount > 0 ? Math.round((presentCount / headcount) * 1000000) / 10000 : null;
    const window = [...items.slice(-6), { attendance_rate: rate }];
    const values = window.flatMap((item) => item.attendance_rate === null ? [] : [item.attendance_rate]);
    items.push({ date, is_working_day: day > 0 && day < 6, headcount, present_count: presentCount, late_count: records.filter((record) => record.late_minutes > 0).length, attendance_rate: rate, moving_avg_7d: values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10000) / 10000 : null });
  }
  return { department, items };
}

export async function explainEndpoint(endpoint: ExplainEndpointName, params: Record<string, string | number | undefined> = {}): Promise<ExplainEndpoint> {
  if (USE_MOCKS) return { endpoint, collection: endpoint === "attendance_list" ? "attendance_logs" : "employees + attendance_logs", explain: { mock: true, message: "Explain output is available when API mode is enabled." } };
  const search = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)]));
  return apiRequest<ExplainEndpoint>(`/admin/explain/${encodeURIComponent(endpoint)}?${search}`);
}
