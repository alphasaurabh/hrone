import type { LucideIcon } from "lucide-react";
import { ClayCard } from "./ClayCard";

export function ClayStatCard({ label, value, detail, icon: Icon, surface = "white" }: { label: string; value: string; detail: string; icon: LucideIcon; surface?: "white" | "lavender" | "pink" | "mint" | "blue" }) {
  return <ClayCard surface={surface} className="p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-bold text-muted">{label}</p><p className="mt-2 text-3xl font-black tracking-tight text-ink">{value}</p></div><div className="grid size-10 place-items-center rounded-2xl bg-white/70 text-primary shadow-clay-subtle"><Icon size={19} /></div></div><p className="mt-5 text-[11px] font-bold leading-relaxed text-muted">{detail}</p></ClayCard>;
}
