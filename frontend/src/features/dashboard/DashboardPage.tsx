import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Clock3, Coffee, Sparkles, UsersRound } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ClayBadge } from "../../components/ui/ClayBadge";
import { ClayCard } from "../../components/ui/ClayCard";
import { ClayPageHeader } from "../../components/ui/ClayPageHeader";
import { ClayStatCard } from "../../components/ui/ClayStatCard";
import { ClayInput } from "../../components/ui/ClayInput";
import { attendanceDemo, dashboardSummaryDemo } from "./demoData";
import { AttendanceMixChart, DepartmentSummaryChart, QuickActions, RecentAttendance } from "./DashboardSections";

export function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState("2026-07-20");
  const [searchParams] = useSearchParams();
  return (
    <div className="mx-auto w-full max-w-[1500px] py-6 sm:py-8">
      <ClayPageHeader eyebrow="Attendance workspace · demo mode" title="Attendance Overview" description="Review presence, timekeeping, and working-day signals in one calm workspace." action={<div className="flex w-full items-center gap-2 sm:w-auto"><label className="sr-only" htmlFor="dashboard-date">Attendance date</label><ClayInput id="dashboard-date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="min-w-0 text-xs font-bold sm:w-40" /><Link to={`/attendance?date_from=${selectedDate}&date_to=${selectedDate}`} className="clay-control shrink-0 bg-primary px-4 py-3 text-xs text-white shadow-clay-button hover:brightness-105"><Sparkles size={15} />View records</Link></div>} />

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4" aria-label="Attendance summary">
        <ClayStatCard label="Present Today" value={`${dashboardSummaryDemo.presentToday}/${dashboardSummaryDemo.totalEmployees}`} detail="Presence-status records for the selected day" icon={UsersRound} surface="mint" />
        <ClayStatCard label="Late Arrivals" value={`${dashboardSummaryDemo.lateArrivals}`} detail="Records with stored late minutes above zero" icon={Clock3} surface="lavender" />
        <ClayStatCard label="Absent Employees" value={`${dashboardSummaryDemo.absentEmployees}`} detail="Employees without a presence record in this demo" icon={Coffee} surface="pink" />
        <ClayStatCard label="Average Work Hours" value={`${dashboardSummaryDemo.averageWorkHours.toFixed(2)}h`} detail="Average of completed work-hour records" icon={UsersRound} surface="blue" />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <ClayCard className="p-5 sm:p-7">
          <div className="mb-7 flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-muted">Illustrative trend</p><h2 className="mt-1 text-xl font-black">Attendance overview</h2></div><ClayBadge status="DEMO" /></div>
          <div className="h-[240px] w-full sm:h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={attendanceDemo} barGap={8} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}><CartesianGrid vertical={false} stroke="#b7acd8" strokeDasharray="4 4" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#6f6587", fontSize: 11, fontWeight: 700 }} /><YAxis hide domain={[0, 100]} /><Tooltip cursor={{ fill: "#dcd5f0" }} contentStyle={{ border: 0, borderRadius: 16, backgroundColor: "#f0edf9", color: "#251746", boxShadow: "0 8px 18px rgba(83,66,132,.24)", fontSize: 12 }} /><Legend verticalAlign="top" align="right" height={24} iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 700, color: "#6f6587" }} /><Bar dataKey="present" name="Present" fill="#7041db" radius={[7, 7, 7, 7]} barSize={20} /><Bar dataKey="absent" name="Absent" fill="#e58eaf" radius={[7, 7, 7, 7]} barSize={20} /></BarChart></ResponsiveContainer></div>
        </ClayCard>

      </section>
      <section className="mt-5 grid gap-5 xl:grid-cols-2"><DepartmentSummaryChart /><AttendanceMixChart /></section>
      <RecentAttendance query={searchParams.get("q") ?? ""} />
      <QuickActions />
    </div>
  );
}
