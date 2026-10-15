type Status = "PRESENT" | "WFH" | "ON_DUTY" | "ABSENT" | "LEAVE" | "DEMO";

const labels: Record<Status, string> = { PRESENT: "Present", WFH: "Work from home", ON_DUTY: "On duty", ABSENT: "Absent", LEAVE: "Leave", DEMO: "Demo data" };
const colors: Record<Status, string> = { PRESENT: "bg-mint text-emerald-950", WFH: "bg-blue text-blue-950", ON_DUTY: "bg-lavender text-primary", ABSENT: "bg-slate-200 text-slate-700", LEAVE: "bg-pink text-rose-950", DEMO: "bg-lavender text-primary" };

export function ClayBadge({ status }: { status: Status }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${colors[status]}`}><span className="size-1.5 rounded-full bg-current" />{labels[status]}</span>;
}
