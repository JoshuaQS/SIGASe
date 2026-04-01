import {
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  GraduationCap,
  Hash,
  Mail,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ModalFormHeader, modalFormShellClass } from "@/components/ui/forms/modalFormPrimitives";

const statusActiveBlockClass = "bg-[hsl(142_72%_42%/0.05)] border-[hsl(142_72%_42%/0.2)]";

const statusHistory = [
  { status: "ACTIVE", date: "15 Ene 2024", by: "M. García (Admin)", reason: "Reactivación por solicitud formal del alumno" },
  { status: "INACTIVE", date: "10 Dic 2023", by: "J. Torres (Admin)", reason: "Sanción por 3 libros no devueltos en tiempo" },
  { status: "ACTIVE", date: "01 Sep 2023", by: "Sistema", reason: "Alta automática — inicio de cuatrimestre" },
];

const accessHistory = [
  { action: "Préstamo", book: "Diseño Centrado en el Usuario", date: "Hoy, 10:32", color: "bg-primary/10 text-primary" },
  { action: "Devolución", book: "Cálculo Diferencial e Integral", date: "Ayer, 14:05", color: "bg-[hsl(142_72%_42%/0.1)] text-[hsl(142_72%_32%)]" },
  { action: "Préstamo", book: "Fundamentos de Bases de Datos", date: "12 Ene, 09:15", color: "bg-primary/10 text-primary" },
  { action: "Consulta", book: "Álgebra Lineal Aplicada", date: "10 Ene, 11:20", color: "bg-muted text-muted-foreground" },
];

export function StudentDetailModal() {
  return (
    <div className={`${modalFormShellClass} w-full`}>
      <ModalFormHeader
        avatar={<span className="text-lg font-bold text-primary">AM</span>}
        title="Ana Martínez López"
        badges={
          <Badge variant="success" dotClassName="bg-[hsl(142_72%_42%)]">
            Activo
          </Badge>
        }
        subtitle={
          <>
            <span className="font-mono">2024-003</span> · Ingeniería en Sistemas · 3er cuatrimestre · Vista de detalle
          </>
        }
      />

      <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="space-y-5 p-6">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Información personal</p>
            <div className="space-y-3.5">
              {(
                [
                  { icon: User, label: "Nombre completo", value: "Ana Martínez López", mono: false },
                  { icon: Hash, label: "Matrícula", value: "2024-003", mono: true },
                  { icon: GraduationCap, label: "Carrera", value: "Ingeniería en Sistemas Computacionales", mono: false },
                  { icon: Calendar, label: "Cuatrimestre", value: "3er cuatrimestre", mono: false },
                  { icon: Mail, label: "Correo institucional", value: "ana.martinez@utez.edu.mx", mono: true },
                  { icon: BookOpen, label: "Libros prestados", value: "2 de 3 disponibles", mono: false },
                ] as const
              ).map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <item.icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground">{item.label}</p>
                    <p className={`text-sm font-medium text-foreground ${item.mono ? "font-mono text-xs" : ""}`}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado actual</p>
            <div className={`rounded-xl border p-4 ${statusActiveBlockClass}`}>
              <div className="mb-1.5 flex items-center justify-between">
                <Badge variant="success" dotClassName="bg-[hsl(142_72%_42%)]">
                  Activo
                </Badge>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  15 Ene 2024
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Motivo: Reactivación por solicitud formal del alumno</p>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-6">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Historial de estados</p>
            <div className="relative pl-4">
              <div className="absolute bottom-2 left-1.5 top-2 w-px bg-border" />
              <div className="space-y-5">
                {statusHistory.map((h, i) => (
                  <div key={i} className="flex gap-3">
                    <div
                      className={`relative z-10 -ml-4 mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-card ${h.status === "ACTIVE" ? "bg-[hsl(142_72%_42%)]" : "bg-muted-foreground"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex flex-wrap items-center gap-2">
                        <span
                          className={`text-xs font-semibold ${h.status === "ACTIVE" ? "text-[hsl(142_72%_32%)]" : "text-muted-foreground"}`}
                        >
                          {h.status === "ACTIVE" ? "Activado" : "Desactivado"}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <ArrowRight className="h-2.5 w-2.5" />
                          {h.date}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Por: {h.by}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-foreground">{h.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Historial de accesos</p>
            <div className="space-y-1">
              {accessHistory.map((a, i) => (
                <div key={i} className="flex items-center justify-between border-b border-border py-2.5 last:border-0">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${a.color}`}>{a.action}</span>
                    <p className="truncate text-xs font-medium text-foreground">{a.book}</p>
                  </div>
                  <span className="ml-2 shrink-0 text-[11px] text-muted-foreground">{a.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
