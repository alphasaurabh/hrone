import type { LucideIcon } from "lucide-react";
import { ClayButton } from "./ClayButton";

export function ClayIconButton({ icon: Icon, label, badge, className = "", onClick }: { icon: LucideIcon; label: string; badge?: string; className?: string; onClick?: () => void }) {
  return (
    <div className={`relative ${className}`}>
      <ClayButton variant="icon" className="grid size-10 place-items-center p-0" aria-label={label} onClick={onClick}>
        <Icon size={18} />
      </ClayButton>
      {badge && <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-black text-white">{badge}</span>}
    </div>
  );
}
