import type { HTMLAttributes } from "react";

type Surface = "white" | "lavender" | "pink" | "mint" | "blue";

const surfaces: Record<Surface, string> = {
  white: "bg-white",
  lavender: "bg-lavender",
  pink: "bg-pink",
  mint: "bg-mint",
  blue: "bg-blue",
};

export function ClayCard({ surface = "white", className = "", ...props }: HTMLAttributes<HTMLDivElement> & { surface?: Surface }) {
  return <div className={`rounded-clay shadow-clay ${surfaces[surface]} ${className}`} {...props} />;
}
