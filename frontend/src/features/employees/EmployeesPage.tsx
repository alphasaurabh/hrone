import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Plus } from "lucide-react";
import { ClayButton } from "../../components/ui/ClayButton";
import { ClayCard } from "../../components/ui/ClayCard";
import { ClayInput, ClaySearch } from "../../components/ui/ClayInput";
import { ClayModal } from "../../components/ui/ClayModal";
import { ClayPageHeader } from "../../components/ui/ClayPageHeader";
import { ClaySelect } from "../../components/ui/ClaySelect";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/States";
import { ClayTable, ClayPagination } from "../../components/ui/ClayTable";
import { createEmployee, listEmployees, USE_MOCKS } from "../../lib/api/services";
import type { Employee, EmployeeCreate } from "../../lib/api/types";

const emptyForm: EmployeeCreate = { emp_code: "", name: "", email: "", department: "", shift_start: "09:30", shift_end: "18:30", joined_on: "" };
const departments = ["All departments", "Engineering", "Sales", "Support"];

export function EmployeesPage() {
  const [items, setItems] = useState<Employee[]>([]);
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const pageSize = 5;

  const load = async () => { setLoading(true); setError(""); try { const result = await listEmployees({ department: department || undefined, page, page_size: pageSize }); setItems(result.items); setTotal(result.total); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load employees."); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, [department, page]);
  const visible = useMemo(() => items.filter((item) => `${item.emp_code} ${item.name} ${item.department}`.toLowerCase().includes(query.toLowerCase())), [items, query]);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setFormError("");
    if (!/^EMP\d{4,6}$/.test(form.emp_code) || !form.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email) || !form.department || !form.joined_on) { setFormError("Enter a valid employee code, name, email, department, and joining date."); return; }
    if (form.shift_start === form.shift_end) { setFormError("Shift start and end must differ."); return; }
    setSaving(true); try { await createEmployee(form); setOpen(false); setForm(emptyForm); await load(); } catch (cause) { setFormError(cause instanceof Error ? cause.message : "Could not create employee."); } finally { setSaving(false); }
  };
  return <div className="mx-auto w-full max-w-375 py-6 sm:py-8">
    <ClayPageHeader eyebrow={`Employee directory · ${USE_MOCKS ? "demo mode" : "API mode"}`} title="Employees" description={`${total} employees in the current directory.`} action={<ClayButton className="px-4 py-3 text-xs" onClick={() => setOpen(true)}><Plus size={15} />Add employee</ClayButton>} />
    <ClayCard className="p-4 sm:p-5"><div className="grid gap-3 md:grid-cols-[1fr_220px]"><ClaySearch placeholder="Search employees..." value={query} onChange={(event) => setQuery(event.target.value)} /><ClaySelect value={department || "All departments"} onChange={(event) => { setDepartment(event.target.value === "All departments" ? "" : event.target.value); setPage(1); }} aria-label="Department filter">{departments.map((item) => <option key={item}>{item}</option>)}</ClaySelect></div></ClayCard>
    <div className="mt-5 rounded-clay bg-white shadow-clay">{loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : visible.length === 0 ? <EmptyState message="No employees match these filters." /> : <><ClayTable><thead className="bg-lavender/55 text-[10px] font-black uppercase tracking-wider text-muted"><tr><th className="px-5 py-4">Employee</th><th className="px-5 py-4">Department</th><th className="px-5 py-4">Shift</th><th className="px-5 py-4">Joined</th></tr></thead><tbody className="divide-y divide-lavender/50 text-xs">{visible.map((employee) => <tr key={employee.emp_code} className="hover:bg-lavender/30"><td className="px-5 py-4"><div className="font-black">{employee.name}</div><div className="mt-1 font-bold text-muted">{employee.emp_code} · {employee.email}</div></td><td className="px-5 py-4 font-bold">{employee.department}</td><td className="px-5 py-4 font-bold text-muted">{employee.shift_start} – {employee.shift_end}</td><td className="px-5 py-4 font-bold text-muted">{employee.joined_on}</td></tr>)}</tbody></ClayTable><ClayPagination page={page} totalPages={Math.max(1, Math.ceil(total / pageSize))} onPageChange={setPage} /></>}</div>
    {open && <ClayModal title="Add employee" description="Create an employee using the contract-supported fields." onClose={() => { setOpen(false); setFormError(""); }}><form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>{(["emp_code", "name", "email", "department", "joined_on", "shift_start", "shift_end"] as const).map((field) => <label className="text-xs font-black text-ink" key={field}>{field.replace("_", " ")}<ClayInput className="mt-2" type={field === "joined_on" ? "date" : "text"} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} required /></label>)}{formError && <p className="sm:col-span-2 rounded-2xl bg-pink p-3 text-xs font-bold text-rose-900">{formError}</p>}<div className="flex justify-end gap-3 sm:col-span-2"><ClayButton type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</ClayButton><ClayButton type="submit" disabled={saving}>{saving ? "Saving..." : "Create employee"}</ClayButton></div></form></ClayModal>}
  </div>;
}
