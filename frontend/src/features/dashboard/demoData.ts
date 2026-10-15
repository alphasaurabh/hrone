export type DemoAttendanceRecord = {
  emp_code: string;
  name: string;
  department: string;
  date: string;
  punch_in: string | null;
  punch_out: string | null;
  work_hours: number | null;
  late_minutes: number;
  status: "PRESENT" | "WFH" | "ON_DUTY" | "ABSENT" | "LEAVE";
};

export const attendanceDemo = [
  { day: "Mon", present: 84, absent: 10 },
  { day: "Tue", present: 91, absent: 7 },
  { day: "Wed", present: 88, absent: 9 },
  { day: "Thu", present: 95, absent: 4 },
  { day: "Fri", present: 93, absent: 5 },
  { day: "Sat", present: 37, absent: 2 },
  { day: "Sun", present: 22, absent: 1 },
];

export const departmentDemo = [
  { department: "Engineering", present: 94, headcount: 112 },
  { department: "Sales", present: 82, headcount: 64 },
  { department: "Support", present: 91, headcount: 48 },
  { department: "Operations", present: 76, headcount: 24 },
];

export const recentAttendanceDemo: DemoAttendanceRecord[] = [
  { emp_code: "EMP0001", name: "Asha Rao", department: "Engineering", date: "2026-07-20", punch_in: "09:28", punch_out: "18:35", work_hours: 9.12, late_minutes: 0, status: "PRESENT" },
  { emp_code: "EMP0003", name: "Neha Iyer", department: "Sales", date: "2026-07-20", punch_in: "10:05", punch_out: "19:10", work_hours: 9.08, late_minutes: 35, status: "PRESENT" },
  { emp_code: "EMP0004", name: "Rohit Das", department: "Sales", date: "2026-07-20", punch_in: "09:30", punch_out: "13:00", work_hours: 3.5, late_minutes: 0, status: "WFH" },
  { emp_code: "EMP0006", name: "Karan Bedi", department: "Support", date: "2026-07-20", punch_in: "09:35", punch_out: null, work_hours: null, late_minutes: 0, status: "PRESENT" },
  { emp_code: "EMP0005", name: "Meera Nair", department: "Support", date: "2026-07-20", punch_in: null, punch_out: null, work_hours: null, late_minutes: 0, status: "ABSENT" },
];

export const dashboardSummaryDemo = {
  presentToday: 3,
  totalEmployees: 5,
  lateArrivals: 1,
  absentEmployees: 1,
  averageWorkHours: 7.23,
};
