import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Clock3, UsersRound } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ClayBadge } from "../../components/ui/ClayBadge";
import { ClayCard } from "../../components/ui/ClayCard";
import { ClayPagination, ClayTable } from "../../components/ui/ClayTable";
import { departmentDemo, recentAttendanceDemo, type DemoAttendanceRecord } from "./demoData";

const chartTooltipStyle = { border: 0, borderRadius: 16, backgroundColor: "#f0edf9", color: "#251746", boxShadow: "0 8px 18px rgba(83,66,132,.24)", fontSize: 12 };
export function DepartmentSummaryChart() {
  return (
    <ClayCard surface="lavender" className="p-5 sm:p-7">
      <div className="mb-5 flex items-start justify-between">
        <div><p className="text-xs font-black uppercase tracking-wider text-muted">Department summary</p><h2 className="mt-1 text-xl font-black">Presence by team</h2></div>
        <UsersRound className="text-primary" size={20} />
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={departmentDemo} layout="vertical" margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
            <CartesianGrid horizontal={false} stroke="#b7acd8" strokeDasharray="4 4" />
            <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: "#6f6587", fontSize: 10, fontWeight: 700 }} unit="%" />
            <YAxis type="category" dataKey="department" width={74} axisLine={false} tickLine={false} tick={{ fill: "#251746", fontSize: 11, fontWeight: 800 }} />
            <Tooltip formatter={(value: number) => [`${value}%`, "Present"]} contentStyle={chartTooltipStyle} cursor={{ fill: "#dcd5f0" }} />
            <Bar dataKey="present" fill="#7041db" radius={[0, 8, 8, 0]} barSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Link to="/analytics" className="mt-3 inline-flex items-center gap-2 text-xs font-black text-primary">Open analytics <ArrowRight size={14} /></Link>
    </ClayCard>
  );
}

export function AttendanceMixChart() {
  const mix = [{ name: "Present", value: 78, color: "#7041db" }, { name: "WFH", value: 12, color: "#7faee8" }, { name: "Leave", value: 6, color: "#e58eaf" }, { name: "Absent", value: 4, color: "#988caf" }];
  return (
    <ClayCard surface="blue" className="p-5 sm:p-7">
      <div className="mb-5 flex items-start justify-between">
        <div><p className="text-xs font-black uppercase tracking-wider text-muted">Status distribution</p><h2 className="mt-1 text-xl font-black">Attendance mix</h2></div>
        <CalendarDays className="text-primary" size={20} />
      </div>
      <div className="grid items-center gap-4 sm:grid-cols-[150px_1fr]">
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={mix} dataKey="value" nameKey="name" innerRadius={45} outerRadius={68} paddingAngle={3} stroke="none">{mix.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip formatter={(value: number) => [`${value}%`, "Records"]} contentStyle={chartTooltipStyle} /><Legend verticalAlign="bottom" height={20} iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 700, color: "#6f6587" }} /></PieChart></ResponsiveContainer>
        </div>
        <div className="space-y-3">{mix.map((item) => <div className="flex items-center justify-between text-xs" key={item.name}><span className="flex items-center gap-2 font-bold"><span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span><span className="font-black">{item.value}%</span></div>)}</div>
      </div>
      <p className="mt-3 text-[11px] font-bold text-muted">Illustrative period mix. Values are not connected to the API.</p>
    </ClayCard>
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(`${date}T00:00:00`));
}

export function RecentAttendance({ query }: { query: string }) {
  const filtered = recentAttendanceDemo.filter((record) => `${record.emp_code} ${record.name} ${record.department}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <ClayCard className="mt-5 p-5 sm:p-7">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div><p className="text-xs font-black uppercase tracking-wider text-muted">Recent records · demo data</p><h2 className="mt-1 text-xl font-black">Recent attendance</h2></div>
        <Link to="/attendance" className="inline-flex items-center gap-2 text-xs font-black text-primary">View all records <ArrowRight size={14} /></Link>
      </div>
      <ClayTable>
        <thead className="bg-lavender/55 text-[10px] font-black uppercase tracking-wider text-muted"><tr><th className="px-5 py-4">Employee</th><th className="px-5 py-4">Date</th><th className="px-5 py-4">Punch in</th><th className="px-5 py-4">Punch out</th><th className="px-5 py-4">Hours</th><th className="px-5 py-4">Status</th></tr></thead>
        <tbody className="divide-y divide-lavender/50 text-xs">{filtered.map((record) => <AttendanceRow key={`${record.emp_code}-${record.date}`} record={record} />)}</tbody>
      </ClayTable>
      {filtered.length === 0 && <p className="py-8 text-center text-sm font-bold text-muted">No demo records match “{query}”.</p>}
      <ClayPagination page={1} totalPages={1} />
    </ClayCard>
  );
}

function AttendanceRow({ record }: { record: DemoAttendanceRecord }) {
  return <tr className="transition-colors hover:bg-lavender/30"><td className="px-5 py-4"><div className="font-black text-ink">{record.name}</div><div className="mt-1 text-[10px] font-bold text-muted">{record.emp_code} · {record.department}</div></td><td className="px-5 py-4 font-bold text-muted">{formatDate(record.date)}</td><td className="px-5 py-4 font-bold">{record.punch_in ?? "—"}</td><td className="px-5 py-4 font-bold text-muted">{record.punch_out ?? "—"}</td><td className="px-5 py-4 font-black">{record.work_hours !== null ? `${record.work_hours.toFixed(2)}h` : "—"}</td><td className="px-5 py-4"><ClayBadge status={record.status} /></td></tr>;
}

export function QuickActions() {
  return <ClayCard surface="pink" className="mt-5 p-5 sm:p-7"><div className="mb-5"><p className="text-xs font-black uppercase tracking-wider text-muted">Quick actions</p><h2 className="mt-1 text-xl font-black">Keep work moving</h2></div><div className="grid gap-3 sm:grid-cols-3"><QuickAction to="/attendance" icon={Clock3} label="Attendance records" /><QuickAction to="/employees" icon={UsersRound} label="Browse employees" /><QuickAction to="/analytics" icon={CalendarDays} label="Explore analytics" /></div></ClayCard>;
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: typeof Clock3; label: string }) {
  return <Link to={to} className="clay-control justify-between bg-white/75 text-xs text-ink shadow-clay-subtle hover:bg-white"><span className="flex items-center gap-2"><Icon size={16} className="text-primary" />{label}</span><ArrowRight size={14} className="text-muted" /></Link>;
}
