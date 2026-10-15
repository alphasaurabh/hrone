import type { SelectHTMLAttributes } from "react";

export function ClaySelect({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`clay-input appearance-none ${className}`} {...props} />;
}
