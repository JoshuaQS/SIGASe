import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`)
  .max(PASSWORD_MAX_LENGTH, `La contraseña no puede exceder ${PASSWORD_MAX_LENGTH} caracteres.`)
  .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula.')
  .regex(/[a-z]/, 'Debe incluir al menos una minúscula.')
  .regex(/\d/, 'Debe incluir al menos un número.')
  .regex(/[^\w\s]/, 'Debe incluir al menos un carácter especial.');

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Ingresa un correo electrónico válido');

export const institutionalEmailSchema = emailSchema.endsWith('@utez.edu.mx', {
  message: 'El correo debe ser institucional (@utez.edu.mx)',
});

const HUMAN_NAME_PATTERN = /^[\p{L}]+(?:[ '\-][\p{L}]+)*$/u;
const REASON_PATTERN = new RegExp("^[\\p{L}\\p{N} .,;:¡!¿?'\"()\\-_/&]+$", 'u');
const ENROLLMENT_EMAIL_DOMAIN = '@utez.edu.mx';

export function capitalizeHumanName(value: string) {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (normalized.length === 0) {
    return '';
  }

  let result = '';
  let capitalizeNext = true;

  for (const char of normalized) {
    if (/\s/.test(char)) {
      result += char;
      capitalizeNext = true;
      continue;
    }
    if (char === '\'' || char === '-') {
      result += char;
      capitalizeNext = true;
      continue;
    }
    result += capitalizeNext ? char.toLocaleUpperCase('es-MX') : char.toLocaleLowerCase('es-MX');
    capitalizeNext = false;
  }

  return result;
}

export function deriveInstitutionalEmailFromEnrollmentId(value: string) {
  const normalized = value.trim().replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z0-9]{10,11}$/.test(normalized)) {
    return '';
  }

  const baseEnrollment = normalized.length === 11 && normalized.startsWith('I')
    ? normalized.slice(1)
    : normalized;

  if (!/^[A-Z0-9]{10}$/.test(baseEnrollment)) {
    return '';
  }

  return `${baseEnrollment.toLowerCase()}${ENROLLMENT_EMAIL_DOMAIN}`;
}

function buildHumanNameSchema(allowEmpty: boolean) {
  return z
    .string()
    .trim()
    .transform((value) => value.replace(/\s+/g, ' '))
    .refine((value) => {
      if (allowEmpty && value === '') return true;
      return value.length >= 2 && value.length <= 100 && HUMAN_NAME_PATTERN.test(value);
    }, {
      message: 'Usa solo letras, espacios simples, apóstrofo o guion.',
    });
}

export const humanNameSchema = buildHumanNameSchema(false);
export const optionalHumanNameSchema = buildHumanNameSchema(true);

export const reasonSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s+/g, ' '))
  .refine((value) => value.length >= 10, {
    message: 'El motivo debe tener al menos 10 caracteres.',
  })
  .refine((value) => value.length <= 500, {
    message: 'El motivo no puede exceder 500 caracteres.',
  })
  .refine((value) => !/[<>]/.test(value) && !/script/i.test(value), {
    message: 'El motivo contiene caracteres no permitidos.',
  })
  .refine((value) => REASON_PATTERN.test(value), {
    message: 'Usa solo letras, números y puntuación básica.',
  });

export const enrollmentIdSchema = z
  .string()
  .transform((value) => value.trim().replace(/\s+/g, '').toUpperCase())
  .refine((value) => /^[A-Z0-9]+$/.test(value), {
    message: 'La matrícula solo puede contener letras y números.',
  })
  .refine((value) => {
    if (value.length === 11) return value.startsWith('I');
    if (value.length === 10) return !value.startsWith('I');
    return false;
  }, {
    message: 'La matrícula debe tener 10 u 11 caracteres y respetar la regla del prefijo I.',
  });

export const confirmPasswordSchema = z
  .string()
  .min(1, 'Confirma tu nueva contraseña');
