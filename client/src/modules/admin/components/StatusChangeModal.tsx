import { useState } from "react";
import { AlertTriangle, CheckCircle2, GraduationCap, Info, Users } from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import {
  ModalFormBody,
  ModalFormFooter,
  ModalFormHeader,
  modalFormShellClass,
} from "@/components/ui/forms/modalFormPrimitives";

type Status = "ACTIVO" | "SUSPENDIDO";

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring";
const selectCls = `${inputCls} h-9 appearance-none`;
const textareaCls = `${inputCls} resize-none py-2`;

function FormField({
  label,
  required,
  optional,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
        {optional ? <span className="ml-1 font-normal text-muted-foreground">(opcional)</span> : null}
      </label>
      {children}
      {hint ? <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function statusBadgeVariant(status: Status): BadgeVariant {
  switch (status) {
    case "ACTIVO":
      return "success";
    case "SUSPENDIDO":
      return "destructive";
  }
}

function statusDotClass(status: Status) {
  switch (status) {
    case "ACTIVO":
      return "bg-success";
    case "SUSPENDIDO":
      return "bg-destructive";
    default:
      return "bg-muted-foreground";
  }
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function StatusDialog({
  title,
  name,
  role,
  currentStatus,
}: {
  title: string;
  name: string;
  role: string;
  currentStatus: Status;
}) {
  const [newStatus, setNewStatus] = useState<Status | "">("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const isDestructive = newStatus === "SUSPENDIDO";
  const needsReason = newStatus === "SUSPENDIDO";
  const canConfirm = Boolean(newStatus) && (!needsReason || reason.trim().length > 0);

  const reset = () => {
    setConfirmed(false);
    setNewStatus("");
    setReason("");
  };

  if (confirmed) {
    return (
      <div className={`${modalFormShellClass} max-w-lg`}>
        <ModalFormHeader
          avatar={<CheckCircle2 className="h-6 w-6" strokeWidth={2.25} aria-hidden />}
          avatarRingClassName="bg-success/15 text-success ring-success/30"
          title="Estado actualizado"
          subtitle={
            <>
              <span className="font-medium text-foreground">{name}</span> pasó a{" "}
              <Badge variant={statusBadgeVariant(newStatus as Status)} className="align-middle text-[10px]">
                {String(newStatus).charAt(0) + String(newStatus).slice(1).toLowerCase()}
              </Badge>
            </>
          }
          badges={
            <Badge variant="outlined" className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Confirmado
            </Badge>
          }
        />
        <ModalFormBody className="py-6 text-center">
          <button
            type="button"
            onClick={reset}
            className="h-9 rounded-md border border-border bg-card px-4 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            Volver al formulario
          </button>
        </ModalFormBody>
      </div>
    );
  }

  return (
    <div className={`${modalFormShellClass} max-w-lg`}>
      <ModalFormHeader
        avatar={<span className="text-lg font-bold text-primary">{initials(name)}</span>}
        title={name}
        badges={
          <Badge variant={statusBadgeVariant(currentStatus)} className="text-xs capitalize" dotClassName={statusDotClass(currentStatus)}>
            {currentStatus.charAt(0) + currentStatus.slice(1).toLowerCase()}
          </Badge>
        }
        subtitle={
          <>
            <span className="font-medium text-foreground/90">{role}</span> · {title}
          </>
        }
        onClose={() => {
          setNewStatus("");
          setReason("");
        }}
      />
      <ModalFormBody>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cambio de estado</p>
        <p className="text-xs text-muted-foreground">Este cambio tiene efecto inmediato sobre el acceso del usuario.</p>

        {isDestructive ? (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={2.25} />
            <p className="text-xs font-medium leading-relaxed text-destructive">
              {newStatus === "SUSPENDIDO"
                ? "La suspensión bloquea el acceso de forma inmediata. Requiere motivo obligatorio."
                : "Desactivar el usuario revocará su acceso al sistema hasta nueva activación."}
            </p>
          </div>
        ) : null}

        <FormField label="Nuevo estado" required>
          <select
            className={selectCls}
            value={newStatus}
            onChange={(e) => setNewStatus((e.target.value || "") as Status | "")}
          >
            <option value="">Seleccionar nuevo estado…</option>
            {(["ACTIVO", "INACTIVO", "SUSPENDIDO"] as Status[])
              .filter((s) => s !== currentStatus)
              .map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
          </select>
        </FormField>

        <FormField
          label="Motivo"
          required={needsReason}
          optional={Boolean(newStatus) && !needsReason}
          hint={
            needsReason
              ? "Requerido para suspensión. Se registra en el audit log."
              : "Se registrará en el historial de cambios."
          }
        >
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe el motivo del cambio de estado…"
            rows={3}
            className={`${textareaCls} h-20 text-sm`}
          />
        </FormField>
      </ModalFormBody>
      <ModalFormFooter>
        <button
          type="button"
          onClick={reset}
          className="h-9 rounded-md px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => canConfirm && setConfirmed(true)}
          className={`h-9 rounded-md px-4 text-sm font-medium transition-colors ${canConfirm
            ? isDestructive
              ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
            : "cursor-not-allowed bg-muted text-muted-foreground"
            }`}
        >
          Confirmar cambio
        </button>
      </ModalFormFooter>
    </div>
  );
}

const patternNotes = [
  { rule: "Contexto visual", desc: "Siempre mostrar quién es el sujeto afectado con su estado actual." },
  { rule: "Warning destructivo", desc: "Banner rojo para SUSPENDIDO e INACTIVO. Solo para acciones de alto impacto." },
  { rule: "Motivo condicional", desc: "Requerido para SUSPENDIDO. Opcional para INACTIVO. Omitir para ACTIVO." },
  { rule: "Botón de riesgo", desc: "Estilo destructivo cuando el cambio revoca acceso." },
  { rule: "Audit trail", desc: "El motivo se registra en audit_logs con actor y timestamp." },
  { rule: "Sin undos", desc: "Los cambios de estado no tienen deshacer; el copy del diálogo lo deja claro." },
] as const;

export function StatusChangeForm() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
            <h3 className="text-sm font-semibold text-foreground">Cambio de estado — Administrador</h3>
          </div>
          <p className="flex gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span>Se abre desde el menú de acciones de la fila en la tabla de administradores.</span>
          </p>
          <StatusDialog
            title="Cambiar estado de administrador"
            name="María González Reyes"
            role="BIBLIOTECA"
            currentStatus="ACTIVO"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
            <h3 className="text-sm font-semibold text-foreground">Cambio de estado — Estudiante</h3>
          </div>
          <p className="flex gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span>Se abre desde el menú de acciones de la fila en la tabla de estudiantes.</span>
          </p>
          <StatusDialog
            title="Cambiar estado de estudiante"
            name="Sofía Reyes Torres"
            role="IDS · 5° cuatrimestre"
            currentStatus="ACTIVO"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Patrones del status dialog</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {patternNotes.map((p) => (
            <div key={p.rule} className="space-y-1">
              <p className="text-xs font-semibold text-foreground">{p.rule}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
