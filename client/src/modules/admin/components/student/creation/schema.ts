import { z } from "zod";

export const formSchema = z.object({
  nombres: z.string().min(2, "Ingresa al menos 2 caracteres"),
  apellidoPaterno: z.string().min(2, "Ingresa al menos 2 caracteres"),
  apellidoMaterno: z
    .string()
    .trim()
    .max(100, "No puede exceder 100 caracteres")
    .optional(),
  matricula: z
    .string()
    .min(6, "La matrícula debe tener al menos 6 caracteres")
    .max(10, "La matrícula no puede exceder 10 caracteres")
    .regex(/^[A-Z0-9]+$/i, "Solo letras y números"),
  correo: z.string().email("Correo inválido").endsWith(".edu.mx", "Debe ser un correo institucional (.edu.mx)"),
  sexo: z.string().min(1, "Selecciona una opción"),
  cuatrimestre: z.string().min(1, "Selecciona un cuatrimestre"),
  carrera: z.string().min(1, "Selecciona una carrera"),
});

export type FormValues = z.infer<typeof formSchema>;

export const cuatrimestres = Array.from({ length: 12 }, (_, i) => String(i + 1));

export const sexoOptions = [
  { value: "MALE", label: "Masculino" },
  { value: "FEMALE", label: "Femenino" },
  { value: "NON_BINARY", label: "No binario" },
];

export const defaultValues: FormValues = {
  nombres: "", apellidoPaterno: "", apellidoMaterno: "",
  matricula: "", correo: "", sexo: "", cuatrimestre: "", carrera: "",
};
