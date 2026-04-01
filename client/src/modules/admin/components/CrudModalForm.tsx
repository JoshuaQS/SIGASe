import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Eye,
  EyeOff,
  GraduationCap,
  Hash,
  KeyRound,
  Mail,
  User,
  UserPlus,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  ModalFormBody,
  ModalFormFooter,
  ModalFormHeader,
  modalFormShellClass,
} from "@/components/ui/forms/modalFormPrimitives";

export type EntityType = "admin" | "student";
export type FormMode = "create" | "edit";

export type AdminCrudValues = {
  fullName: string;
  email: string;
  password?: string;
  role: "TI" | "BIBLIOTECA";
  active: boolean;
};

export type StudentCrudValues = {
  matricula: string;
  firstName: string;
  lastNamePaternal: string;
  lastNameMaternal?: string;
  sex: "M" | "F" | "NB";
  quarter: number;
  career: string;
  active: boolean;
};

export type CrudModalSubmitPayload =
  | { entity: "admin"; mode: FormMode; values: AdminCrudValues }
  | { entity: "student"; mode: FormMode; values: StudentCrudValues };

interface CrudModalFormProps {
  entity?: EntityType;
  mode?: FormMode;
  showEntitySwitcher?: boolean;
  showModeSwitcher?: boolean;
  isSubmitting?: boolean;
  onCancel?: () => void;
  onSubmit?: (payload: CrudModalSubmitPayload) => void | Promise<void>;
}

const inputCls =
  "h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring";
const selectCls = `${inputCls} appearance-none`;

const defaultAdminValues: AdminCrudValues = {
  fullName: "",
  email: "",
  password: "",
  role: "TI",
  active: true,
};

const sampleAdminEditValues: AdminCrudValues = {
  fullName: "Carlos Mendoza",
  email: "carlos.mendoza@utez.edu.mx",
  role: "BIBLIOTECA",
  active: true,
};

const defaultStudentValues: StudentCrudValues = {
  matricula: "",
  firstName: "",
  lastNamePaternal: "",
  lastNameMaternal: "",
  sex: "F",
  quarter: 1,
  career: "",
  active: true,
};

const sampleStudentEditValues: StudentCrudValues = {
  matricula: "2024-042",
  firstName: "Ana",
  lastNamePaternal: "Martínez",
  lastNameMaternal: "López",
  sex: "F",
  quarter: 3,
  career: "IS",
  active: true,
};

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

function IconField({
  icon: Icon,
  label,
  required,
  children,
}: {
  icon: LucideIcon;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <div className="flex gap-3">
        <div className="mt-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

function AdminForm({
  isEdit,
  values,
  disabled,
  onChange,
}: {
  isEdit: boolean;
  values: AdminCrudValues;
  disabled: boolean;
  onChange: (patch: Partial<AdminCrudValues>) => void;
}) {
  const [showPass, setShowPass] = useState(false);

  return (
    <>
      <IconField icon={User} label="Nombre completo" required>
        <input
          type="text"
          placeholder="Ej. Juan Martínez Ruiz"
          value={values.fullName}
          onChange={(event) => onChange({ fullName: event.target.value })}
          className={inputCls}
          disabled={disabled}
        />
      </IconField>

      <IconField icon={Mail} label="Correo electrónico" required>
        <input
          type="email"
          placeholder="usuario@utez.edu.mx"
          value={values.email}
          onChange={(event) => onChange({ email: event.target.value })}
          className={inputCls}
          disabled={disabled}
        />
      </IconField>

      {!isEdit && (
        <IconField icon={KeyRound} label="Contraseña" required>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              placeholder="Mínimo 8 caracteres"
              value={values.password ?? ""}
              onChange={(event) => onChange({ password: event.target.value })}
              className={`${inputCls} pr-9`}
              disabled={disabled}
            />
            <button
              type="button"
              onClick={() => setShowPass((prev) => !prev)}
              className="absolute right-2.5 top-2 text-muted-foreground transition-colors hover:text-foreground"
              disabled={disabled}
            >
              {showPass ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </IconField>
      )}

      <IconField icon={Briefcase} label="Rol" required>
        <select
          className={selectCls}
          value={values.role}
          onChange={(event) => onChange({ role: event.target.value as "TI" | "BIBLIOTECA" })}
          disabled={disabled}
        >
          <option value="TI">TI — Tecnologías de la Información</option>
          <option value="BIBLIOTECA">BIBLIOTECA — Servicios Bibliotecarios</option>
        </select>
      </IconField>

      <div className="flex items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2.5">
        <div>
          <p className="text-xs font-semibold text-foreground">Cuenta activa</p>
          <p className="text-xs text-muted-foreground">
            El usuario podrá iniciar sesión en el sistema
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange({ active: !values.active })}
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${values.active ? "bg-primary" : "bg-muted-foreground/40"
            }`}
          disabled={disabled}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${values.active ? "left-4" : "left-0.5"
              }`}
          />
        </button>
      </div>
    </>
  );
}

function StudentForm({
  isEdit,
  values,
  disabled,
  onChange,
}: {
  isEdit: boolean;
  values: StudentCrudValues;
  disabled: boolean;
  onChange: (patch: Partial<StudentCrudValues>) => void;
}) {
  return (
    <>
      <IconField icon={Hash} label="Matrícula" required>
        <input
          type="text"
          placeholder="Ej. 2024-001"
          value={values.matricula}
          onChange={(event) => onChange({ matricula: event.target.value })}
          className={`${inputCls} font-mono`}
          disabled={disabled}
        />
      </IconField>

      <IconField icon={UserRound} label="Nombre(s)" required>
        <input
          type="text"
          placeholder="Nombre"
          value={values.firstName}
          onChange={(event) => onChange({ firstName: event.target.value })}
          className={inputCls}
          disabled={disabled}
        />
      </IconField>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Apellido paterno" required>
          <input
            type="text"
            placeholder="Apellido"
            value={values.lastNamePaternal}
            onChange={(event) => onChange({ lastNamePaternal: event.target.value })}
            className={inputCls}
            disabled={disabled}
          />
        </Field>
        <Field label="Apellido materno">
          <input
            type="text"
            placeholder="Apellido"
            value={values.lastNameMaternal ?? ""}
            onChange={(event) => onChange({ lastNameMaternal: event.target.value })}
            className={inputCls}
            disabled={disabled}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Sexo" required>
          <select
            className={selectCls}
            value={values.sex}
            onChange={(event) => onChange({ sex: event.target.value as "M" | "F" | "NB" })}
            disabled={disabled}
          >
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
            <option value="NB">Otro / No binario</option>
          </select>
        </Field>

        <Field label="Cuatrimestre" required>
          <select
            className={selectCls}
            value={String(values.quarter)}
            onChange={(event) => onChange({ quarter: Number(event.target.value) })}
            disabled={disabled}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}°
              </option>
            ))}
          </select>
        </Field>
      </div>

      <IconField icon={GraduationCap} label="Carrera" required>
        <select
          className={selectCls}
          value={values.career}
          onChange={(event) => onChange({ career: event.target.value })}
          disabled={disabled}
        >
          <option value="" disabled>
            Selecciona una carrera
          </option>
          <option value="IS">Ingeniería en Sistemas Computacionales</option>
          <option value="II">Ingeniería Industrial</option>
          <option value="ADM">Administración de Empresas</option>
          <option value="ENF">Enfermería General</option>
          <option value="DER">Derecho</option>
          <option value="MKT">Mercadotecnia</option>
          <option value="CN">Contabilidad y Finanzas</option>
        </select>
      </IconField>

      <div className="flex items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2.5">
        <div>
          <p className="text-xs font-semibold text-foreground">Cuenta activa</p>
          <p className="text-xs text-muted-foreground">
            {isEdit
              ? "Desactivar impide el acceso al sistema sin borrar el registro"
              : "El usuario podrá iniciar sesión en el sistema"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange({ active: !values.active })}
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${values.active ? "bg-primary" : "bg-muted-foreground/40"
            }`}
          disabled={disabled}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${values.active ? "left-4" : "left-0.5"
              }`}
          />
        </button>
      </div>
    </>
  );
}

export function CrudModalForm({
  entity: entityProp,
  mode: modeProp,
  showEntitySwitcher = true,
  showModeSwitcher = true,
  isSubmitting = false,
  onCancel,
  onSubmit,
}: CrudModalFormProps) {
  const [entity, setEntity] = useState<EntityType>(entityProp ?? "admin");
  const [mode, setMode] = useState<FormMode>(modeProp ?? "create");
  const [adminValues, setAdminValues] = useState<AdminCrudValues>(defaultAdminValues);
  const [studentValues, setStudentValues] = useState<StudentCrudValues>(defaultStudentValues);

  const effectiveEntity = entityProp ?? entity;
  const effectiveMode = modeProp ?? mode;
  const isEdit = effectiveMode === "edit";
  const isAdmin = effectiveEntity === "admin";

  useEffect(() => {
    if (entityProp) setEntity(entityProp);
  }, [entityProp]);

  useEffect(() => {
    if (modeProp) setMode(modeProp);
  }, [modeProp]);

  useEffect(() => {
    if (isEdit) {
      setAdminValues(sampleAdminEditValues);
      setStudentValues(sampleStudentEditValues);
      return;
    }
    setAdminValues(defaultAdminValues);
    setStudentValues(defaultStudentValues);
  }, [effectiveEntity, isEdit]);

  const header = useMemo(() => {
    if (isAdmin && isEdit) {
      return {
        avatar: <span className="text-lg font-bold text-primary">CM</span>,
        title: adminValues.fullName || "Administrador",
        subtitle: (
          <>
            <span className="font-mono">{adminValues.email || "usuario@utez.edu.mx"}</span> · {adminValues.role} · Edición de administrador
          </>
        ),
        badges: (
          <Badge variant={adminValues.active ? "success" : "muted"} dotClassName={adminValues.active ? "bg-success" : "bg-muted-foreground"}>
            {adminValues.active ? "Activo" : "Inactivo"}
          </Badge>
        ),
      };
    }

    if (isAdmin && !isEdit) {
      return {
        avatar: <UserPlus className="text-primary" strokeWidth={2} />,
        title: "Nuevo administrador",
        subtitle: "Completa los datos del usuario. El acceso queda sujeto al rol asignado.",
        badges: (
          <>
            <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wide">
              Alta
            </Badge>
            <Badge variant="secondary" className="text-[10px] font-semibold">
              Admin
            </Badge>
          </>
        ),
      };
    }

    if (!isAdmin && isEdit) {
      return {
        avatar: <span className="text-lg font-bold text-primary">AM</span>,
        title:
          [studentValues.firstName, studentValues.lastNamePaternal, studentValues.lastNameMaternal]
            .filter(Boolean)
            .join(" ") || "Estudiante",
        subtitle: (
          <>
            <span className="font-mono">{studentValues.matricula || "2024-000"}</span> · {studentValues.career || "Sin carrera"} · {studentValues.quarter}er cuatrimestre · Edición de estudiante
          </>
        ),
        badges: (
          <Badge variant={studentValues.active ? "success" : "muted"} dotClassName={studentValues.active ? "bg-success" : "bg-muted-foreground"}>
            {studentValues.active ? "Activo" : "Inactivo"}
          </Badge>
        ),
      };
    }

    return {
      avatar: <GraduationCap className="text-primary" strokeWidth={2} />,
      title: "Nuevo estudiante",
      subtitle: "Registro inicial en el sistema. La matrícula debe ser única.",
      badges: (
        <>
          <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wide">
            Alta
          </Badge>
          <Badge variant="secondary" className="text-[10px] font-semibold">
            Estudiante
          </Badge>
        </>
      ),
    };
  }, [adminValues, isAdmin, isEdit, studentValues]);

  const canSubmit = isAdmin
    ? Boolean(adminValues.fullName.trim() && adminValues.email.trim() && (isEdit || adminValues.password?.trim()))
    : Boolean(
      studentValues.matricula.trim() &&
      studentValues.firstName.trim() &&
      studentValues.lastNamePaternal.trim() &&
      studentValues.career.trim() &&
      studentValues.quarter,
    );

  const handleSubmit = async () => {
    if (!canSubmit || !onSubmit) return;

    if (isAdmin) {
      await onSubmit({
        entity: "admin",
        mode: effectiveMode,
        values: {
          ...adminValues,
          password: isEdit ? undefined : adminValues.password,
        },
      });
      return;
    }

    await onSubmit({
      entity: "student",
      mode: effectiveMode,
      values: studentValues,
    });
  };

  return (
    <div>
      {(showEntitySwitcher || showModeSwitcher) && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {showEntitySwitcher && (
            <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted p-0.5">
              {(["admin", "student"] as const).map((nextEntity) => (
                <button
                  key={nextEntity}
                  type="button"
                  onClick={() => !entityProp && setEntity(nextEntity)}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition-all ${effectiveEntity === nextEntity
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                  disabled={Boolean(entityProp) || isSubmitting}
                >
                  {nextEntity === "admin" ? "Administrador" : "Estudiante"}
                </button>
              ))}
            </div>
          )}

          {showModeSwitcher && (
            <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted p-0.5">
              {(["create", "edit"] as const).map((nextMode) => (
                <button
                  key={nextMode}
                  type="button"
                  onClick={() => !modeProp && setMode(nextMode)}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition-all ${effectiveMode === nextMode
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                  disabled={Boolean(modeProp) || isSubmitting}
                >
                  {nextMode === "create" ? "Crear" : "Editar"}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={`${modalFormShellClass} max-w-lg`}>
        <ModalFormHeader avatar={header.avatar} title={header.title} subtitle={header.subtitle} badges={header.badges} />

        <ModalFormBody>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isEdit ? "Datos del registro" : "Formulario"}
          </p>

          {isAdmin ? (
            <AdminForm
              isEdit={isEdit}
              values={adminValues}
              disabled={isSubmitting}
              onChange={(patch) => setAdminValues((prev) => ({ ...prev, ...patch }))}
            />
          ) : (
            <StudentForm
              isEdit={isEdit}
              values={studentValues}
              disabled={isSubmitting}
              onChange={(patch) => setStudentValues((prev) => ({ ...prev, ...patch }))}
            />
          )}
        </ModalFormBody>

        <ModalFormFooter className="justify-between">
          <p className="mr-auto text-xs text-muted-foreground" />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="h-9 rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting
                ? "Guardando..."
                : isEdit
                  ? "Guardar cambios"
                  : `Crear ${isAdmin ? "administrador" : "estudiante"}`}
            </button>
          </div>
        </ModalFormFooter>
      </div>
    </div>
  );
}
