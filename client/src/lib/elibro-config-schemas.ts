import { z } from 'zod';

export type ElibroConfigFormValues = {
  channelName: string;
  authToken: string;
  clientId: string;
  clientSecret: string;
};

type EditingFields = {
  authToken: boolean;
  clientId: boolean;
  clientSecret: boolean;
};

type BuildSchemaOptions = {
  mode: 'create' | 'update';
  editingFields: EditingFields;
  initialChannelName: string;
};

const secretField = z.string().max(512, 'Máximo 512 caracteres');

export function buildElibroConfigSchema({
  mode,
  editingFields,
  initialChannelName,
}: BuildSchemaOptions) {
  const base = z.object({
    channelName: z
      .string()
      .trim()
      .min(1, 'El Channel Name es obligatorio')
      .max(120, 'Máximo 120 caracteres'),
    authToken: secretField,
    clientId: secretField,
    clientSecret: secretField,
  });

  if (mode === 'create') {
    return base
      .refine((data) => data.authToken.trim().length > 0, {
        message: 'Auth Token es obligatorio',
        path: ['authToken'],
      })
      .refine((data) => data.clientId.trim().length > 0, {
        message: 'Client ID es obligatorio',
        path: ['clientId'],
      })
      .refine((data) => data.clientSecret.trim().length > 0, {
        message: 'Client Secret es obligatorio',
        path: ['clientSecret'],
      });
  }

  return base.superRefine((data, ctx) => {
    if (editingFields.authToken && data.authToken.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Escribe el nuevo Auth Token o cancela su edición.',
        path: ['authToken'],
      });
    }
    if (editingFields.clientId && data.clientId.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Escribe el nuevo Client ID o cancela su edición.',
        path: ['clientId'],
      });
    }
    if (editingFields.clientSecret && data.clientSecret.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Escribe el nuevo Client Secret o cancela su edición.',
        path: ['clientSecret'],
      });
    }

    const hasSecretChanges =
      (editingFields.authToken && data.authToken.trim().length > 0) ||
      (editingFields.clientId && data.clientId.trim().length > 0) ||
      (editingFields.clientSecret && data.clientSecret.trim().length > 0);

    const hasChannelNameChange = data.channelName.trim() !== initialChannelName.trim();
    if (!hasSecretChanges && !hasChannelNameChange) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'No hay cambios para guardar.',
        path: ['channelName'],
      });
    }
  });
}
