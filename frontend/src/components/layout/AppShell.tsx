import { useState } from "react";
import { Link, NavLink, Outlet, useSearchParams } from "react-router-dom";
import {
  BarChart3,
  Bell,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  LayoutDashboard,
  Menu,
  Users,
  X,
} from "lucide-react";
import { ClayIconButton } from "../ui/ClayIconButton";
import { ClaySearch } from "../ui/ClayInput";

const navigation = [
  { label: "Overview", icon: LayoutDashboard, to: "/" },
  { label: "Attendance", icon: CalendarDays, to: "/attendance" },
  { label: "Employees", icon: Users, to: "/employees" },
  { label: "Analytics", icon: BarChart3, to: "/analytics" },
];

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  return (
    <div className="h-screen overflow-hidden bg-canvas text-ink">
      <aside
        className={`fixed inset-y-4 left-4 z-40 flex w-60 flex-col clay-panel p-4 transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-[120%]"
        }`}
        aria-label="Primary navigation"
      >
        <div className="mb-10 flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-primary text-white shadow-clay-button">
              <span className="text-lg font-black">H</span>
            </div>
            <div>
              <p className="text-lg font-black tracking-tight">HROne</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">People pulse</p>
            </div>
          </div>
          <ClayIconButton label="Close menu" icon={X} className="lg:hidden" onClick={() => setMobileOpen(false)} />
        </div>

        <p className="mb-3 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted">Workspace</p>
        <nav className="space-y-2">
          {navigation.map(({ label, icon: Icon, to }) => (
            <NavLink
              key={label}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                  isActive
                    ? "bg-white text-primary shadow-clay-inset"
                    : "text-muted hover:bg-lavender hover:text-ink"
                }`
              }
            >
              <Icon size={18} strokeWidth={2.4} />
              {label}
              <ChevronRight className="ml-auto opacity-0 transition-opacity group-hover:opacity-60" size={15} />
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto rounded-3xl bg-mint p-4 shadow-clay-inset">
          <div className="mb-3 flex items-center gap-2 text-xs font-black text-ink">
            <CircleHelp size={16} />
            Need a hand?
          </div>
          <p className="text-xs leading-relaxed text-muted">Explore your team's rhythm with people-first insights.</p>
          <Link to="/analytics" className="mt-4 inline-block text-xs font-black text-primary underline decoration-2 underline-offset-4">Explore analytics</Link>
        </div>
      </aside>

      {mobileOpen && <button className="fixed inset-0 z-30 bg-ink/20 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}

      <div className="flex h-screen min-w-0 flex-col lg:pl-68">
        <header className="flex h-20 shrink-0 items-center justify-between px-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <ClayIconButton label="Open menu" icon={Menu} className="lg:hidden" onClick={() => setMobileOpen(true)} />
            <div>
              <p className="hidden text-xs font-bold text-muted sm:block">HROne attendance workspace</p>
              <p className="text-sm font-black tracking-tight sm:text-base">Attendance overview <span aria-hidden>✦</span></p>
            </div>
          </div>
          <ClaySearch
            className="mx-4 hidden max-w-xs flex-1 md:block"
            placeholder="Search attendance..."
            value={searchParams.get("q") ?? ""}
            onChange={(event) => {
              const next = new URLSearchParams(searchParams);
              if (event.target.value) next.set("q", event.target.value);
              else next.delete("q");
              setSearchParams(next, { replace: true });
            }}
          />
          <div className="flex items-center gap-3">
            <ClayIconButton label="Notifications" icon={Bell} badge="3" />
            <div className="flex items-center gap-3 rounded-2xl bg-white/60 p-1.5 pr-4 shadow-clay-subtle">
              <div className="grid size-9 place-items-center rounded-xl bg-lavender text-sm font-black text-primary">HR</div>
              <span className="hidden text-xs font-black sm:block">HR workspace</span>
            </div>
          </div>
        </header>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pb-10 sm:px-8 lg:px-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
