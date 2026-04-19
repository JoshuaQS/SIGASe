import { StudentStatusBadge } from "./student-status-badge";
import type { Student } from "./types";

export function StudentsCards({ rows }: { rows: Student[] }) {
  if (rows.length === 0) {
    return (
      <div className="px-5 py-10 text-center text-sm text-muted-foreground">
        No se encontraron estudiantes.
      </div>
    );
  }

  return (
    <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((student) => (
        <article key={student.id} className="rounded-lg border border-border bg-background p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground">{student.name}</h4>
              <p className="text-xs text-muted-foreground">{student.enrollment}</p>
            </div>

            <StudentStatusBadge status={student.status} />
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            <p>{student.email}</p>
            <p>{student.career}</p>
            <p>Último acceso: {student.lastAccess}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
