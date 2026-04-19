import { MoreHorizontal } from "lucide-react";
import { StudentStatusBadge } from "./student-status-badge";
import type { Student } from "./types";

export function StudentsTable({ rows }: { rows: Student[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr className="border-b border-border">
            <th className="px-5 py-3 text-left font-medium">Matrícula</th>
            <th className="px-5 py-3 text-left font-medium">Nombre</th>
            <th className="px-5 py-3 text-left font-medium">Correo</th>
            <th className="px-5 py-3 text-left font-medium">Carrera</th>
            <th className="px-5 py-3 text-left font-medium">Estado</th>
            <th className="px-5 py-3 text-left font-medium">Último acceso</th>
            <th className="px-5 py-3 text-right font-medium">Acciones</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((student) => (
            <tr key={student.id} className="border-b border-border last:border-0 hover:bg-muted/30">
              <td className="px-5 py-3 font-medium text-foreground">{student.enrollment}</td>
              <td className="px-5 py-3 text-foreground">{student.name}</td>
              <td className="px-5 py-3 text-muted-foreground">{student.email}</td>
              <td className="px-5 py-3 text-muted-foreground">{student.career}</td>
              <td className="px-5 py-3">
                <StudentStatusBadge status={student.status} />
              </td>
              <td className="px-5 py-3 text-muted-foreground">{student.lastAccess}</td>
              <td className="px-5 py-3 text-right">
                <button className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-muted-foreground">
          No se encontraron estudiantes.
        </div>
      ) : null}
    </div>
  );
}
