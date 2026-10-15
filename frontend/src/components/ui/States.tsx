import { AlertCircle, Inbox, LoaderCircle } from "lucide-react";
import { ClayButton } from "./ClayButton";

export function LoadingState() { return <div className="flex min-h-32 items-center justify-center text-muted"><LoaderCircle className="animate-spin" size={24} /><span className="ml-3 text-sm font-bold">Loading your workspace…</span></div>; }
export function ErrorState({ message = "Something went wrong.", onRetry }: { message?: string; onRetry?: () => void }) { return <div className="flex min-h-32 flex-col items-center justify-center text-center"><AlertCircle className="text-rose-700" size={24} /><p className="mt-2 text-sm font-bold text-ink">{message}</p>{onRetry && <ClayButton className="mt-4 px-4 py-2 text-xs" variant="secondary" onClick={onRetry}>Try again</ClayButton>}</div>; }
export function EmptyState({ message = "Nothing to show here yet." }: { message?: string }) { return <div className="flex min-h-32 flex-col items-center justify-center text-center text-muted"><Inbox size={24} /><p className="mt-2 text-sm font-bold">{message}</p></div>; }
