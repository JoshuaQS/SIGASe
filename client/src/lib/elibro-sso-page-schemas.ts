import { z } from 'zod';
import type { SsoEditingFields } from '@/modules/admin/components/elibro-sso/elibro-sso.types';

const protectedSecret = z.string().max(512, 'Máximo 512 caracteres');

interface BuildSsoSchemaOptions {
  mode: 'create' | 'update';
  editingFields: SsoEditingFields;
  initialChannelName: string;
}

/**
 * Esquema Zod para la página de Configuración SSO eLibro.
 * Usa los nombres correctos de la API: channelId, channelSecret (no clientId/clientSecret).
 */
export function buildSsoPageSchema({
  mode,
  editingFields,
  initialChannelName,
}: BuildSsoSchemaOptions) {
  const base = z.object({
    channelName: z
      .string()
      .trim()
      .min(1, 'El nombre de configuración es obligatorio')
      .max(120, 'Máximo 120 caracteres'),
    authToken: protectedSecret,
    channelId: protectedSecret,
    channelSecret: protectedSecret,
  });

  if (mode === 'create') {
    return base
      .refine((d) => d.authToken.trim().length > 0, {
        message: 'El Auth Token es obligatorio al crear la configuración',
        path: ['authToken'],
      })
      .refine((d) => d.channelId.trim().length > 0, {
        message: 'El Channel ID es obligatorio al crear la configuración',
        path: ['channelId'],
      })
      .refine((d) => d.channelSecret.trim().length > 0, {
        message: 'El Channel Secret es obligatorio al crear la configuración',
        path: ['channelSecret'],
      });
  }

  return base.superRefine((data, ctx) => {
    if (editingFields.authToken && data.authToken.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Escribe el nuevo Auth Token o cancela su edición',
        path: ['authToken'],
      });
    }
    if (editingFields.channelId && data.channelId.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Escribe el nuevo Channel ID o cancela su edición',
        path: ['channelId'],
      });
    }
    if (editingFields.channelSecret && data.channelSecret.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Escribe el nuevo Channel Secret o cancela su edición',
        path: ['channelSecret'],
      });
    }

    const hasSecretChanges =
      (editingFields.authToken && data.authToken.trim().length > 0) ||
      (editingFields.channelId && data.channelId.trim().length > 0) ||
      (editingFields.channelSecret && data.channelSecret.trim().length > 0);

    const hasNameChange =
      data.channelName.trim() !== initialChannelName.trim();

    if (!hasSecretChanges && !hasNameChange) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'No hay cambios para guardar',
        path: ['channelName'],
      });
    }
  });
}
