export function ClayProgress({ value, color = "bg-primary" }: { value: number; color?: string }) {
  return <div className="h-2 overflow-hidden rounded-full bg-lavender shadow-clay-inset"><div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} /></div>;
}
