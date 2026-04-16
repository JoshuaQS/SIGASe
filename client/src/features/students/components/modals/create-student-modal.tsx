import { useEffect, useMemo, useState, type FocusEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { GraduationCap, Hash, Loader2, Mail, X } from "lucide-react";
import { InputWithIcon } from "@/shared/components/ui/input-with-icon";
import { useAppToast } from "@/shared/components/ui/app-toast-provider";
import { listActiveCareers, type CareerDto } from "@/features/careers/api/careers-api";
import {
  createStudent,
  type StudentBackendSex,
  type StudentResponseDto,
  updateStudent,
} from "@/features/students/api/students-api";
import {
  cuatrimestres,
  defaultValues,
  formSchema,
  type FormValues,
  sexoOptions,
} from "@/features/students/schemas/create-student-schema";
import { capitalizeHumanName, deriveInstitutionalEmailFromEnrollmentId } from "@/shared/lib/validation";

export type StudentsCreateModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: (student: StudentResponseDto) => void;
  mode?: "create" | "edit";
  student?: StudentResponseDto | null;
};

export function StudentCreateModal({
  open,
  onClose,
  onCreated,
  mode = "create",
  student = null,
}: StudentsCreateModalProps) {
  const { showToast } = useAppToast();
  const [loading, setLoading] = useState(false);
  const [loadingCareers, setLoadingCareers] = useState(false);
  const [careers, setCareers] = useState<CareerDto[]>([]);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues,
  });

  const nombresField = form.register("nombres");
  const apellidoPaternoField = form.register("apellidoPaterno");
  const apellidoMaternoField = form.register("apellidoMaterno");

  const matriculaValue = form.watch("matricula");
  const correoValue = form.watch("correo");
  const derivedCorreo = useMemo(
    () => deriveInstitutionalEmailFromEnrollmentId(matriculaValue ?? ""),
    [matriculaValue],
  );

  useEffect(() => {
    if (!open) return;

    if (correoValue !== derivedCorreo) {
      form.setValue("correo", derivedCorreo, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }
  }, [correoValue, derivedCorreo, form, open]);

  useEffect(() => {
    if (!open) return;

    const loadCareers = async () => {
      setLoadingCareers(true);
      try {
        const response = await listActiveCareers();
        setCareers(response);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo cargar el catálogo de carreras.";
        showToast({
          severity: "error",
          title: "Carreras no disponibles",
          description: message,
        });
      } finally {
        setLoadingCareers(false);
      }
    };

    void loadCareers();
  }, [open, showToast]);

  useEffect(() => {
    if (!open || mode !== "edit" || !student) return;
    form.reset({
      nombres: capitalizeHumanName(student.name),
      apellidoPaterno: capitalizeHumanName(student.lastNamePaternal),
      apellidoMaterno: student.lastNameMaternal ? capitalizeHumanName(student.lastNameMaternal) : "",
      matricula: student.enrollmentId,
      correo: deriveInstitutionalEmailFromEnrollmentId(student.enrollmentId),
      sexo: student.sex,
      cuatrimestre: String(student.quarter),
      careerId: student.career?.id ?? "",
    });
  }, [form, mode, open, student]);

  const handleClose = () => {
    if (loading) return;
    form.reset(defaultValues);
    onClose();
  };

  const syncCapitalizedName = (
    fieldName: "nombres" | "apellidoPaterno" | "apellidoMaterno",
    onBlur: (event: FocusEvent<HTMLInputElement>) => void,
  ) => (event: FocusEvent<HTMLInputElement>) => {
    onBlur(event);
    form.setValue(fieldName, capitalizeHumanName(event.target.value), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const payload = {
        enrollmentId: values.matricula,
        name: capitalizeHumanName(values.nombres),
        lastNamePaternal: capitalizeHumanName(values.apellidoPaterno),
        lastNameMaternal: values.apellidoMaterno?.trim() ? capitalizeHumanName(values.apellidoMaterno) : null,
        sex: values.sexo as StudentBackendSex,
        quarter: Number(values.cuatrimestre),
        institutionalEmail: deriveInstitutionalEmailFromEnrollmentId(values.matricula),
        careerId: values.careerId,
      };

      const savedStudent = mode === "edit" && student
        ? await updateStudent(student.id, payload)
        : await createStudent(payload);

      showToast({
        severity: "success",
        title: mode === "edit" ? "Estudiante actualizado" : "Estudiante creado",
        description:
          mode === "edit"
            ? "Los cambios del estudiante se guardaron correctamente."
            : "Se registró correctamente y se envió el correo para que establezca su contraseña.",
      });

      onCreated?.(savedStudent);
      form.reset(defaultValues);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar el estudiante.";
      showToast({
        severity: "error",
        title: mode === "edit" ? "Error al actualizar estudiante" : "Error al crear estudiante",
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleClose();
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        animation="fade"
        className="max-w-2xl gap-0 overflow-hidden rounded-2xl border border-border p-0 shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-border bg-card px-7 pb-5 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground">
                {mode === "edit" ? "Editar estudiante" : "Crear estudiante"}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {mode === "edit"
                  ? "Actualiza la información base del estudiante con el contrato real del backend"
                  : "Registra un nuevo estudiante en el sistema"}
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Cerrar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto bg-background px-7 py-6">
          <form id="student-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <SectionLabel>Información personal</SectionLabel>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldLabel text="Nombres" required />
                <Input
                  placeholder="Ej. Ana Gabriela"
                  {...nombresField}
                  onBlur={syncCapitalizedName("nombres", nombresField.onBlur)}
                />
                <FieldError message={form.formState.errors.nombres?.message} />
              </div>

              <div>
                <FieldLabel text="Apellido paterno" required />
                <Input
                  placeholder="Ej. Ramírez"
                  {...apellidoPaternoField}
                  onBlur={syncCapitalizedName("apellidoPaterno", apellidoPaternoField.onBlur)}
                />
                <FieldError message={form.formState.errors.apellidoPaterno?.message} />
              </div>

              <div>
                <FieldLabel text="Apellido materno" />
                <Input
                  placeholder="Ej. Torres"
                  {...apellidoMaternoField}
                  onBlur={syncCapitalizedName("apellidoMaterno", apellidoMaternoField.onBlur)}
                />
                <FieldError message={form.formState.errors.apellidoMaterno?.message} />
              </div>

              <div>
                <FieldLabel text="Sexo" required />
                <Controller
                  control={form.control}
                  name="sexo"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona..." />
                      </SelectTrigger>
                      <SelectContent>
                        {sexoOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={form.formState.errors.sexo?.message} />
              </div>
            </div>

            <div className="my-1 border-t border-border" />
            <SectionLabel>Datos académicos</SectionLabel>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel text="Matrícula" required />
                <Controller
                  control={form.control}
                  name="matricula"
                  render={({ field }) => (
                    <InputWithIcon
                      icon={<Hash className="h-4 w-4" />}
                      placeholder="Ej. A12345678"
                      className="font-mono uppercase tracking-wide"
                      value={field.value}
                      onBlur={field.onBlur}
                      onChange={(event) => {
                        const nextValue = event.target.value.toUpperCase()
                        field.onChange(nextValue)
                        form.setValue("correo", deriveInstitutionalEmailFromEnrollmentId(nextValue), {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        })
                      }}
                    />
                  )}
                />
                <FieldError message={form.formState.errors.matricula?.message} />
              </div>

              <div>
                <FieldLabel text="Correo institucional" required />
                <InputWithIcon
                  icon={<Mail className="h-4 w-4" />}
                  placeholder="Se genera automáticamente"
                  type="email"
                  readOnly
                  className="bg-muted/60 text-muted-foreground"
                  {...form.register("correo")}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {derivedCorreo
                    ? `Se generará como ${derivedCorreo}`
                    : 'Captura una matrícula válida para generar el correo institucional.'}
                </p>
                <FieldError message={form.formState.errors.correo?.message} />
              </div>

              <div>
                <FieldLabel text="Cuatrimestre" required />
                <Controller
                  control={form.control}
                  name="cuatrimestre"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona..." />
                      </SelectTrigger>
                      <SelectContent>
                        {cuatrimestres.map((cuatrimestre) => (
                          <SelectItem key={cuatrimestre} value={cuatrimestre}>
                            {cuatrimestre}° cuatrimestre
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={form.formState.errors.cuatrimestre?.message} />
              </div>

              <div>
                <FieldLabel text="Carrera" required />
                <Controller
                  control={form.control}
                name="careerId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una carrera..." />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingCareers ? (
                          <SelectItem value="__loading" disabled>
                            Cargando carreras...
                          </SelectItem>
                        ) : careers.length === 0 ? (
                          <SelectItem value="__empty" disabled>
                            Sin carreras disponibles
                          </SelectItem>
                        ) : (
                          careers.map((career) => (
                            <SelectItem key={career.id} value={career.id}>
                              {career.code} · {career.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={form.formState.errors.careerId?.message} />
              </div>
            </div>
          </form>
        </div>

        <div className="flex justify-end gap-3 border-t border-border bg-card px-7 py-4">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="student-form"
            disabled={loading || !form.formState.isValid}
            className="min-w-[140px]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === "edit" ? "Guardando..." : "Creando..."}
              </>
            ) : (
              mode === "edit" ? "Guardar cambios" : "Crear estudiante"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ModalV1(props: StudentsCreateModalProps) {
  return <StudentCreateModal {...props} />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

function Req() {
  return <span className="ml-0.5 text-destructive">*</span>;
}

function FieldLabel({ text, required }: { text: string; required?: boolean }) {
  return (
    <p className="mb-1.5 text-sm font-medium text-foreground">
      {text}
      {required ? <Req /> : null}
    </p>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}
