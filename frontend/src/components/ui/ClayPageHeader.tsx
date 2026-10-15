import type { ReactNode } from "react";

export function ClayPageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-primary">{eyebrow}</p><h1 className="text-3xl font-black tracking-tight text-ink sm:text-4xl">{title}</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{description}</p></div>{action}</div>;
}
