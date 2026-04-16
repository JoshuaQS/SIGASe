import { z } from 'zod';
import {
  confirmPasswordSchema,
  emailSchema,
  institutionalEmailSchema,
  passwordSchema,
} from '@/shared/lib/validation';

/**
 * Normaliza un email eliminando espacios y convirtiendo a minúsculas.
 */
/**
 * Schema para el login de estudiante por contraseña.
 * Requiere estrictamente el dominio @utez.edu.mx.
 */
export const studentPasswordLoginSchema = z.object({
  email: institutionalEmailSchema,
  password: z.string().min(1, 'La contraseña es requerida'),
});

/**
 * Schema para el login de administrador.
 * Cualquier correo electrónico válido es permitido.
 */
export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'La contraseña es requerida'),
});

/**
 * Schema para solicitar recuperación de contraseña.
 */
export const recoveryRequestSchema = z.object({
  email: emailSchema,
});

/**
 * Schema para restablecer la contraseña (Reset).
 * Implementa reglas fuertes: min 12 caracteres, mayúscula, minúscula, número y símbolo.
 */
export const passwordResetSchema = z
  .object({
    newPassword: passwordSchema,
    confirmNewPassword: confirmPasswordSchema,
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmNewPassword'],
  });

// Tipos inferidos para su uso en los componentes
export type StudentPasswordLoginFields = z.infer<typeof studentPasswordLoginSchema>;
export type AdminLoginFields = z.infer<typeof adminLoginSchema>;
export type RecoveryRequestFields = z.infer<typeof recoveryRequestSchema>;
export type PasswordResetFields = z.infer<typeof passwordResetSchema>;
