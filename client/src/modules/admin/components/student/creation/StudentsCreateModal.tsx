import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { button as Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GraduationCap, Hash, Loader2, Mail, X } from "lucide-react";
import { InputWithIcon } from "@/components/ui/InputWithIcon";
import { useAppToast } from "@/components/ui/app-toast-provider";
import { listActiveCareers, type CareerDto } from "@/lib/api/careers-api";
import {
  createStudent,
  type StudentBackendSex,
  type StudentResponseDto,
} from "@/lib/api/students-api";
import {
  cuatrimestres,
  defaultValues,
  formSchema,
  type FormValues,
  sexoOptions,
} from "@/modules/admin/components/student/creation/schema";

export type StudentsCreateModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: (student: StudentResponseDto) => void;
};

export function StudentsCreateModal({ open, onClose, onCreated }: StudentsCreateModalProps) {
  const { showToast } = useAppToast();
  const [loading, setLoading] = useState(false);
  const [loadingCareers, setLoadingCareers] = useState(false);
  const [careers, setCareers] = useState<CareerDto[]>([]);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

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

  const handleClose = () => {
    if (loading) return;
    form.reset(defaultValues);
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const createdStudent = await createStudent({
        enrollmentId: values.matricula.trim().toUpperCase(),
        name: values.nombres.trim(),
        lastNamePaternal: values.apellidoPaterno.trim(),
        lastNameMaternal: values.apellidoMaterno.trim(),
        sex: values.sexo as StudentBackendSex,
        quarter: Number(values.cuatrimestre),
        institutionalEmail: values.correo.trim().toLowerCase(),
        careerCode: values.carrera,
      });

      showToast({
        severity: "success",
        title: "Estudiante creado",
        description:
          "Se registró correctamente y se envió el correo para que establezca su contraseña.",
      });

      onCreated?.(createdStudent);
      form.reset(defaultValues);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear el estudiante.";
      showToast({
        severity: "error",
        title: "Error al crear estudiante",
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
                Crear estudiante
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Registra un nuevo estudiante en el sistema
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <SectionLabel>Información personal</SectionLabel>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldLabel text="Nombres" required />
                <Input placeholder="Ej. Ana Gabriela" {...form.register("nombres")} />
                <FieldError message={form.formState.errors.nombres?.message} />
              </div>

              <div>
                <FieldLabel text="Apellido paterno" required />
                <Input placeholder="Ej. Ramírez" {...form.register("apellidoPaterno")} />
                <FieldError message={form.formState.errors.apellidoPaterno?.message} />
              </div>

              <div>
                <FieldLabel text="Apellido materno" required />
                <Input placeholder="Ej. Torres" {...form.register("apellidoMaterno")} />
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
                      onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                    />
                  )}
                />
                <FieldError message={form.formState.errors.matricula?.message} />
              </div>

              <div>
                <FieldLabel text="Correo institucional" required />
                <InputWithIcon
                  icon={<Mail className="h-4 w-4" />}
                  placeholder="a123@universidad.edu.mx"
                  type="email"
                  {...form.register("correo")}
                />
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
                  name="carrera"
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
                            <SelectItem key={career.id} value={career.code}>
                              {career.name} ({career.code})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={form.formState.errors.carrera?.message} />
              </div>
            </div>
          </form>
        </div>

        <div className="flex justify-end gap-3 border-t border-border bg-card px-7 py-4">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={loading}
            className="min-w-[140px]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              "Crear estudiante"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ModalV1(props: StudentsCreateModalProps) {
  return <StudentsCreateModal {...props} />;
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
