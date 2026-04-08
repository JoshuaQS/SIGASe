import { z } from 'zod';

/**
 * Normaliza un email eliminando espacios y convirtiendo a minúsculas.
 */
const emailBase = z
  .string()
  .trim()
  .toLowerCase()
  .email('Ingresa un correo electrónico válido');

/**
 * Schema para el login de estudiante por contraseña.
 * Requiere estrictamente el dominio @utez.edu.mx.
 */
export const studentPasswordLoginSchema = z.object({
  email: emailBase.endsWith('@utez.edu.mx', {
    message: 'El correo debe ser institucional (@utez.edu.mx)',
  }),
  password: z.string().min(1, 'La contraseña es requerida'),
});

/**
 * Schema para el login de administrador.
 * Cualquier correo electrónico válido es permitido.
 */
export const adminLoginSchema = z.object({
  email: emailBase,
  password: z.string().min(1, 'La contraseña es requerida'),
});

/**
 * Schema para solicitar recuperación de contraseña.
 */
export const recoveryRequestSchema = z.object({
  email: emailBase,
});

/**
 * Schema para restablecer la contraseña (Reset).
 * Implementa reglas fuertes: min 10 caracteres, mayúscula, minúscula, número y símbolo.
 */
export const passwordResetSchema = z
  .object({
    newPassword: z
      .string()
      .min(10, 'La contraseña debe tener al menos 10 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
      .regex(/[a-z]/, 'Debe contener al menos una minúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número')
      .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial'),
    confirmPassword: z.string().min(1, 'Confirma tu nueva contraseña'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

// Tipos inferidos para su uso en los componentes
export type StudentPasswordLoginFields = z.infer<typeof studentPasswordLoginSchema>;
export type AdminLoginFields = z.infer<typeof adminLoginSchema>;
export type RecoveryRequestFields = z.infer<typeof recoveryRequestSchema>;
export type PasswordResetFields = z.infer<typeof passwordResetSchema>;
