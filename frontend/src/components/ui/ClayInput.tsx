import type { InputHTMLAttributes } from "react";
import { Search } from "lucide-react";

export function ClayInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`clay-input ${className}`} {...props} />;
}

export function ClaySearch({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`relative block ${className}`}>
      <Search className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted" size={17} aria-hidden="true" />
      <ClayInput
        aria-label="Search"
        {...props}
        style={{ ...props.style, paddingLeft: "2.75rem" }}
      />
    </label>
  );
}
