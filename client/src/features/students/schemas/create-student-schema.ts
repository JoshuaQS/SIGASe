import { z } from 'zod';
import {
  enrollmentIdSchema,
  deriveInstitutionalEmailFromEnrollmentId,
  humanNameSchema,
  optionalHumanNameSchema,
} from '@/shared/lib/validation';

export const formSchema = z.object({
  nombres: humanNameSchema,
  apellidoPaterno: humanNameSchema,
  apellidoMaterno: optionalHumanNameSchema,
  matricula: enrollmentIdSchema,
  correo: z.string(),
  sexo: z.string().min(1, 'Selecciona una opción'),
  cuatrimestre: z.string().min(1, 'Selecciona un cuatrimestre'),
  careerId: z.string().min(1, 'Selecciona una carrera'),
}).superRefine((values, ctx) => {
  const expectedEmail = deriveInstitutionalEmailFromEnrollmentId(values.matricula);
  if (!expectedEmail) {
    return;
  }

  if (values.correo !== expectedEmail) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['correo'],
      message: 'El correo se genera automáticamente a partir de la matrícula.',
    });
  }
});

export type FormValues = z.infer<typeof formSchema>;

export const cuatrimestres = Array.from({ length: 11 }, (_, i) => String(i + 1));

export const sexoOptions = [
  { value: 'MALE', label: 'Masculino' },
  { value: 'FEMALE', label: 'Femenino' },
  { value: 'NON_BINARY', label: 'No binario' },
];

export const defaultValues: FormValues = {
  nombres: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  matricula: '',
  correo: '',
  sexo: '',
  cuatrimestre: '',
  careerId: '',
};
