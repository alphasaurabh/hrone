import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ClayButton } from "./ClayButton";

export function ClayTable({ children }: { children: ReactNode }) { return <div className="overflow-hidden rounded-clay bg-white shadow-clay"><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left">{children}</table></div></div>; }
export function ClayPagination({ page = 1, totalPages = 1, onPageChange }: { page?: number; totalPages?: number; onPageChange?: (page: number) => void }) { return <div className="flex items-center justify-between px-5 py-4 text-xs font-bold text-muted"><span>Page {page} of {totalPages}</span><div className="flex gap-2"><ClayButton variant="icon" className="grid size-8 place-items-center p-0" aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange?.(page - 1)}><ChevronLeft size={15} /></ClayButton><ClayButton variant="icon" className="grid size-8 place-items-center p-0" aria-label="Next page" disabled={page >= totalPages} onClick={() => onPageChange?.(page + 1)}><ChevronRight size={15} /></ClayButton></div></div>; }
