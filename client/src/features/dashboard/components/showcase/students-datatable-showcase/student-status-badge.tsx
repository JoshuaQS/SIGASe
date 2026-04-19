import type { StudentStatus } from "./types";

export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  const labelByStatus: Record<StudentStatus, string> = {
    ACTIVE: "Activo",
    PENDING: "Pendiente",
    INACTIVE: "Inactivo",
  };

  const classByStatus: Record<StudentStatus, string> = {
    ACTIVE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
    PENDING: "border-amber-500/30 bg-amber-500/10 text-amber-700",
    INACTIVE: "border-slate-500/30 bg-slate-500/10 text-slate-600",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${classByStatus[status]}`}
    >
      {labelByStatus[status]}
    </span>
  );
}
