import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "soft" | "icon";

export function ClayButton({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    primary: "bg-primary text-white shadow-clay-button hover:brightness-105",
    secondary: "bg-white text-ink shadow-clay-button hover:bg-lavender",
    soft: "bg-lavender text-primary shadow-clay-button hover:bg-white",
    icon: "bg-white text-muted shadow-clay-button hover:text-primary",
  };
  return <button className={`clay-control ${styles[variant]} ${className}`} {...props} />;
}
