import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
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
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Badge } from '@/components/ui/badge';
import {
  ModalFormBody,
  ModalFormFooter,
  ModalFormHeader,
  modalFormShellClass,
} from '@/components/ui/forms/modalFormPrimitives';

export type EntityType = 'admin' | 'student';
export type FormMode = 'create' | 'edit';

export type AdminCrudValues = {
  name: string;
  lastNamePaternal: string;
  lastNameMaternal?: string;
  email: string;
  password: string;
  role: 'ADMIN_TI' | 'ADMIN_BIBLIOTECA';
  active: boolean;
};

export type StudentCrudValues = {
  enrollmentNumber: string;
  name: string;
  lastNamePaternal: string;
  lastNameMaternal?: string;
  sex: 'FEMALE' | 'MALE' | 'NON_BINARY' | 'NOT_SPECIFIED';
  quarter: number;
  career: string;
  institutionalEmail: string;
  active: boolean;
};

export type CrudModalSubmitPayload =
  | { entity: 'admin'; mode: FormMode; values: AdminCrudValues }
  | { entity: 'student'; mode: FormMode; values: StudentCrudValues };

interface CrudModalFormProps {
  entity?: EntityType;
  mode?: FormMode;
  showEntitySwitcher?: boolean;
  showModeSwitcher?: boolean;
  isSubmitting?: boolean;
  initialAdminValues?: Partial<AdminCrudValues>;
  initialStudentValues?: Partial<StudentCrudValues>;
  onCancel?: () => void;
  onSubmit?: (payload: CrudModalSubmitPayload) => void | Promise<void>;
}

const inputCls =
  'h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring';
const selectCls = `${inputCls} appearance-none`;

const defaultAdminValues: AdminCrudValues = {
  name: '',
  lastNamePaternal: '',
  lastNameMaternal: '',
  email: '',
  password: '',
  role: 'ADMIN_TI',
  active: true,
};

const defaultStudentValues: StudentCrudValues = {
  enrollmentNumber: '',
  name: '',
  lastNamePaternal: '',
  lastNameMaternal: '',
  sex: 'NOT_SPECIFIED',
  quarter: 1,
  career: '',
  institutionalEmail: '',
  active: true,
};

const adminSchemaByMode = (mode: FormMode) =>
  z.object({
    name: z.string().trim().min(2, 'Nombre(s) obligatorio.'),
    lastNamePaternal: z.string().trim().min(2, 'Apellido paterno obligatorio.'),
    lastNameMaternal: z.string().optional(),
    email: z.string().trim().email('Correo inválido.'),
    password:
      mode === 'create'
        ? z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.')
        : z.string().optional().transform((value) => value ?? ''),
    role: z.enum(['ADMIN_TI', 'ADMIN_BIBLIOTECA']),
    active: z.boolean(),
  });

const studentSchema = z.object({
  enrollmentNumber: z.string().trim().min(3, 'Matrícula obligatoria.'),
  name: z.string().trim().min(2, 'Nombre(s) obligatorio.'),
  lastNamePaternal: z.string().trim().min(2, 'Apellido paterno obligatorio.'),
  lastNameMaternal: z.string().optional(),
  sex: z.enum(['FEMALE', 'MALE', 'NON_BINARY', 'NOT_SPECIFIED']),
  quarter: z.number().int().min(1, 'Mínimo 1.').max(12, 'Máximo 12.'),
  career: z.string().trim().min(2, 'Carrera obligatoria.'),
  institutionalEmail: z.string().trim().email('Correo institucional inválido.'),
  active: z.boolean(),
});

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}

function IconField({
  icon: Icon,
  label,
  required,
  error,
  children,
}: {
  icon: LucideIcon;
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
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
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}

export function CrudModalForm({
  entity: entityProp,
  mode: modeProp,
  showEntitySwitcher = true,
  showModeSwitcher = true,
  isSubmitting = false,
  initialAdminValues,
  initialStudentValues,
  onCancel,
  onSubmit,
}: CrudModalFormProps) {
  const [entity, setEntity] = useState<EntityType>(entityProp ?? 'admin');
  const [mode, setMode] = useState<FormMode>(modeProp ?? 'create');
  const [showPass, setShowPass] = useState(false);

  const effectiveEntity = entityProp ?? entity;
  const effectiveMode = modeProp ?? mode;
  const isEdit = effectiveMode === 'edit';
  const isAdmin = effectiveEntity === 'admin';

  const adminSchema = useMemo(() => adminSchemaByMode(effectiveMode), [effectiveMode]);

  const {
    register: registerAdmin,
    watch: watchAdmin,
    setValue: setAdminValue,
    handleSubmit: handleAdminSubmit,
    reset: resetAdmin,
    formState: { errors: adminErrors, isValid: isAdminValid },
  } = useForm<AdminCrudValues>({
    resolver: zodResolver(adminSchema),
    mode: 'onChange',
    defaultValues: {
      ...defaultAdminValues,
      ...initialAdminValues,
      password: initialAdminValues?.password ?? '',
    },
  });

  const {
    register: registerStudent,
    watch: watchStudent,
    setValue: setStudentValue,
    handleSubmit: handleStudentSubmit,
    reset: resetStudent,
    formState: { errors: studentErrors, isValid: isStudentValid },
  } = useForm<StudentCrudValues>({
    resolver: zodResolver(studentSchema),
    mode: 'onChange',
    defaultValues: {
      ...defaultStudentValues,
      ...initialStudentValues,
    },
  });

  useEffect(() => {
    if (entityProp) setEntity(entityProp);
  }, [entityProp]);

  useEffect(() => {
    if (modeProp) setMode(modeProp);
  }, [modeProp]);

  useEffect(() => {
    resetAdmin({
      ...defaultAdminValues,
      ...initialAdminValues,
      password: initialAdminValues?.password ?? '',
    });
  }, [initialAdminValues, resetAdmin, effectiveMode]);

  useEffect(() => {
    resetStudent({
      ...defaultStudentValues,
      ...initialStudentValues,
    });
  }, [initialStudentValues, resetStudent, effectiveMode]);

  const adminValues = watchAdmin();
  const studentValues = watchStudent();

  const header = useMemo(() => {
    if (isAdmin && isEdit) {
      return {
        avatar: <span className="text-lg font-bold text-primary">{(adminValues.name || 'A').slice(0, 2).toUpperCase()}</span>,
        title: [adminValues.name, adminValues.lastNamePaternal, adminValues.lastNameMaternal].filter(Boolean).join(' ') || 'Administrador',
        subtitle: (
          <>
            <span className="font-mono">{adminValues.email || 'usuario@utez.edu.mx'}</span> ·{' '}
            {adminValues.role === 'ADMIN_TI' ? 'TI' : 'BIBLIOTECA'} · Edición de administrador
          </>
        ),
        badges: (
          <Badge variant={adminValues.active ? 'success' : 'muted'} dotClassName={adminValues.active ? 'bg-success' : 'bg-muted-foreground'}>
            {adminValues.active ? 'Activo' : 'Inactivo'}
          </Badge>
        ),
      };
    }

    if (isAdmin && !isEdit) {
      return {
        avatar: <UserPlus className="text-primary" strokeWidth={2} />,
        title: 'Nuevo administrador',
        subtitle: 'Completa los datos del usuario. El acceso queda sujeto al rol asignado.',
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
        avatar: <span className="text-lg font-bold text-primary">{(studentValues.name || 'E').slice(0, 2).toUpperCase()}</span>,
        title: [studentValues.name, studentValues.lastNamePaternal, studentValues.lastNameMaternal].filter(Boolean).join(' ') || 'Estudiante',
        subtitle: (
          <>
            <span className="font-mono">{studentValues.enrollmentNumber || '2024-000'}</span> · {studentValues.career || 'Sin carrera'} ·{' '}
            {studentValues.quarter}° cuatrimestre · Edición de estudiante
          </>
        ),
        badges: (
          <Badge variant={studentValues.active ? 'success' : 'muted'} dotClassName={studentValues.active ? 'bg-success' : 'bg-muted-foreground'}>
            {studentValues.active ? 'Activo' : 'Inactivo'}
          </Badge>
        ),
      };
    }

    return {
      avatar: <GraduationCap className="text-primary" strokeWidth={2} />,
      title: 'Nuevo estudiante',
      subtitle: 'Registro inicial en el sistema. La matrícula debe ser única.',
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

  const canSubmit = isAdmin ? isAdminValid : isStudentValid;

  const submitAdmin = handleAdminSubmit(async (values) => {
    if (!onSubmit) return;
    await onSubmit({
      entity: 'admin',
      mode: effectiveMode,
      values,
    });
  });

  const submitStudent = handleStudentSubmit(async (values) => {
    if (!onSubmit) return;
    await onSubmit({
      entity: 'student',
      mode: effectiveMode,
      values,
    });
  });

  return (
    <div>
      {(showEntitySwitcher || showModeSwitcher) && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {showEntitySwitcher ? (
            <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted p-0.5">
              {(['admin', 'student'] as const).map((nextEntity) => (
                <button
                  key={nextEntity}
                  type="button"
                  onClick={() => !entityProp && setEntity(nextEntity)}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition-all ${effectiveEntity === nextEntity ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  disabled={Boolean(entityProp) || isSubmitting}
                >
                  {nextEntity === 'admin' ? 'Administrador' : 'Estudiante'}
                </button>
              ))}
            </div>
          ) : null}

          {showModeSwitcher ? (
            <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted p-0.5">
              {(['create', 'edit'] as const).map((nextMode) => (
                <button
                  key={nextMode}
                  type="button"
                  onClick={() => !modeProp && setMode(nextMode)}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition-all ${effectiveMode === nextMode ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  disabled={Boolean(modeProp) || isSubmitting}
                >
                  {nextMode === 'create' ? 'Crear' : 'Editar'}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}

      <div className={`${modalFormShellClass} max-w-lg`}>
        <ModalFormHeader avatar={header.avatar} title={header.title} subtitle={header.subtitle} badges={header.badges} />

        <ModalFormBody>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isEdit ? 'Datos del registro' : 'Formulario'}
          </p>

          {isAdmin ? (
            <>
              <IconField icon={User} label="Nombre(s)" required error={adminErrors.name?.message}>
                <input type="text" placeholder="Ej. Juan" className={inputCls} disabled={isSubmitting} {...registerAdmin('name')} />
              </IconField>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Apellido paterno" required error={adminErrors.lastNamePaternal?.message}>
                  <input type="text" placeholder="Apellido" className={inputCls} disabled={isSubmitting} {...registerAdmin('lastNamePaternal')} />
                </Field>
                <Field label="Apellido materno" error={adminErrors.lastNameMaternal?.message}>
                  <input type="text" placeholder="Apellido" className={inputCls} disabled={isSubmitting} {...registerAdmin('lastNameMaternal')} />
                </Field>
              </div>

              <IconField icon={Mail} label="Correo electrónico" required error={adminErrors.email?.message}>
                <input type="email" placeholder="usuario@utez.edu.mx" className={inputCls} disabled={isSubmitting} {...registerAdmin('email')} />
              </IconField>

              {!isEdit ? (
                <IconField icon={KeyRound} label="Contraseña" required error={adminErrors.password?.message}>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="Mínimo 8 caracteres"
                      className={`${inputCls} pr-9`}
                      disabled={isSubmitting}
                      {...registerAdmin('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((prev) => !prev)}
                      className="absolute right-2.5 top-2 text-muted-foreground transition-colors hover:text-foreground"
                      disabled={isSubmitting}
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </IconField>
              ) : null}

              <IconField icon={Briefcase} label="Rol" required error={adminErrors.role?.message}>
                <select className={selectCls} disabled={isSubmitting} {...registerAdmin('role')}>
                  <option value="ADMIN_TI">TI — Tecnologías de la Información</option>
                  <option value="ADMIN_BIBLIOTECA">BIBLIOTECA — Servicios Bibliotecarios</option>
                </select>
              </IconField>

              <div className="flex items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2.5">
                <div>
                  <p className="text-xs font-semibold text-foreground">Cuenta activa</p>
                  <p className="text-xs text-muted-foreground">El usuario podrá iniciar sesión en el sistema</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAdminValue('active', !watchAdmin('active'), { shouldDirty: true, shouldValidate: true })}
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${watchAdmin('active') ? 'bg-primary' : 'bg-muted-foreground/40'}`}
                  disabled={isSubmitting}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${watchAdmin('active') ? 'left-4' : 'left-0.5'}`} />
                </button>
              </div>
            </>
          ) : (
            <>
              <IconField icon={Hash} label="Matrícula" required error={studentErrors.enrollmentNumber?.message}>
                <input type="text" placeholder="Ej. 2024-001" className={`${inputCls} font-mono`} disabled={isSubmitting} {...registerStudent('enrollmentNumber')} />
              </IconField>

              <IconField icon={UserRound} label="Nombre(s)" required error={studentErrors.name?.message}>
                <input type="text" placeholder="Nombre(s)" className={inputCls} disabled={isSubmitting} {...registerStudent('name')} />
              </IconField>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Apellido paterno" required error={studentErrors.lastNamePaternal?.message}>
                  <input type="text" placeholder="Apellido" className={inputCls} disabled={isSubmitting} {...registerStudent('lastNamePaternal')} />
                </Field>
                <Field label="Apellido materno" error={studentErrors.lastNameMaternal?.message}>
                  <input type="text" placeholder="Apellido" className={inputCls} disabled={isSubmitting} {...registerStudent('lastNameMaternal')} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Sexo" required error={studentErrors.sex?.message}>
                  <select className={selectCls} disabled={isSubmitting} {...registerStudent('sex')}>
                    <option value="MALE">Masculino</option>
                    <option value="FEMALE">Femenino</option>
                    <option value="NON_BINARY">Otro / No binario</option>
                    <option value="NOT_SPECIFIED">No especificado</option>
                  </select>
                </Field>

                <Field label="Cuatrimestre" required error={studentErrors.quarter?.message}>
                  <select
                    className={selectCls}
                    disabled={isSubmitting}
                    value={String(watchStudent('quarter') ?? 1)}
                    onChange={(event) =>
                      setStudentValue('quarter', Number(event.target.value), {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}°
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <IconField icon={GraduationCap} label="Carrera" required error={studentErrors.career?.message}>
                <input type="text" placeholder="Ej. Ingeniería en Sistemas" className={inputCls} disabled={isSubmitting} {...registerStudent('career')} />
              </IconField>

              <IconField icon={Mail} label="Correo institucional" required error={studentErrors.institutionalEmail?.message}>
                <input type="email" placeholder="usuario@utez.edu.mx" className={inputCls} disabled={isSubmitting} {...registerStudent('institutionalEmail')} />
              </IconField>

              <div className="flex items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2.5">
                <div>
                  <p className="text-xs font-semibold text-foreground">Cuenta activa</p>
                  <p className="text-xs text-muted-foreground">
                    {isEdit
                      ? 'Desactivar impide el acceso al sistema sin borrar el registro'
                      : 'El usuario podrá iniciar sesión en el sistema'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStudentValue('active', !watchStudent('active'), { shouldDirty: true, shouldValidate: true })}
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${watchStudent('active') ? 'bg-primary' : 'bg-muted-foreground/40'}`}
                  disabled={isSubmitting}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${watchStudent('active') ? 'left-4' : 'left-0.5'}`} />
                </button>
              </div>
            </>
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
              onClick={() => void (isAdmin ? submitAdmin() : submitStudent())}
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting
                ? 'Guardando...'
                : isEdit
                  ? 'Guardar cambios'
                  : `Crear ${isAdmin ? 'administrador' : 'estudiante'}`}
            </button>
          </div>
        </ModalFormFooter>
      </div>
    </div>
  );
}
