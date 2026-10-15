import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { EmployeesPage } from "../features/employees/EmployeesPage";
import { AttendancePage } from "../features/attendance/AttendancePage";
import { AnalyticsOverviewPage, DepartmentTrendPage, EmployeeMonthlyAnalyticsPage, LateLeaderboardPage } from "../features/analytics/AnalyticsPages";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/analytics" element={<AnalyticsOverviewPage />} />
        <Route path="/analytics/employees" element={<EmployeeMonthlyAnalyticsPage />} />
        <Route path="/analytics/employees/" element={<EmployeeMonthlyAnalyticsPage />} />
        <Route path="/analytics/leaderboard" element={<LateLeaderboardPage />} />
        <Route path="/analytics/departments/" element={<DepartmentTrendPage />} />
        <Route path="/analytics/departments/:department/trend" element={<DepartmentTrendPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
