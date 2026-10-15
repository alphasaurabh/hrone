import type { ReactNode } from "react";
import { X } from "lucide-react";
import { ClayIconButton } from "./ClayIconButton";

export function ClayModal({ title, description, children, onClose }: { title: string; description?: string; children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/25 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
    <div className="w-full max-w-2xl rounded-clay bg-white p-5 shadow-clay sm:p-7">
      <div className="mb-6 flex items-start justify-between gap-4"><div><h2 className="text-xl font-black">{title}</h2>{description && <p className="mt-1 text-sm text-muted">{description}</p>}</div><ClayIconButton label="Close dialog" icon={X} onClick={onClose} /></div>
      {children}
    </div>
  </div>;
}
