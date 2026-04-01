import { Globe, KeyRound } from 'lucide-react';
import { FormSection, FormSectionHeader } from '@/components/ui/forms/form-section';
import { FormField } from '@/components/ui/forms/form-field';
import { ProtectedField, type ProtectedFieldMode } from '@/components/ui/forms/protected-field';
import type { UseFormRegister, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import type { SsoFormValues, SsoEditingFields, SsoProtectedOriginals, SsoProtectedKey } from './elibro-sso.types';
import { FIXED_AUTH_ENDPOINT } from './elibro-sso.types';

interface SsoCredentialsCardProps {
  isEditMode: boolean;
  editingFields: SsoEditingFields;
  originals: SsoProtectedOriginals;
  register: UseFormRegister<SsoFormValues>;
  errors: FieldErrors<SsoFormValues>;
  watch: UseFormWatch<SsoFormValues>;
  setValue: UseFormSetValue<SsoFormValues>;
  onStartEdit: (key: SsoProtectedKey) => void;
  onCancelEdit: (key: SsoProtectedKey) => void;
}

export function SsoCredentialsCard({
  isEditMode,
  editingFields,
  originals,
  register,
  errors,
  watch,
  setValue,
  onStartEdit,
  onCancelEdit,
}: SsoCredentialsCardProps) {
  const getMode = (key: SsoProtectedKey): ProtectedFieldMode => {
    if (editingFields[key]) return 'editing';
    if (isEditMode) return 'select';
    return 'view';
  };

  const handleStartEdit = (key: SsoProtectedKey) => {
    if (!isEditMode) return;
    onStartEdit(key);
    setValue(key, '');
  };

  const handleCancelEdit = (key: SsoProtectedKey) => {
    onCancelEdit(key);
    setValue(key, '');
  };

  return (
    <FormSection>
      <FormSectionHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <KeyRound className="h-3.5 w-3.5 text-primary" aria-hidden />
          </div>
          <p className="text-sm font-semibold text-foreground">Credenciales y canal</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Los campos protegidos se almacenan cifrados. Solo se envían al servidor los que edites.
        </p>
      </FormSectionHeader>

      <div className="space-y-4 pt-2">
        {/* Nombre de configuración */}
        <FormField
          label="Nombre de configuración"
          htmlFor="sso-channel-name"
          hint={isEditMode ? 'Identificador descriptivo del canal SSO (ej. ITSLP-2024)' : undefined}
          error={errors.channelName?.message}
          reserveMessageSpace
        >
          <input
            id="sso-channel-name"
            type="text"
            {...register('channelName')}
            disabled={!isEditMode}
            placeholder={isEditMode ? 'Ej. ITSLP-2024' : 'Sin configurar'}
            aria-invalid={!!errors.channelName}
            className={`h-9 w-full rounded-md border bg-background px-3 text-sm text-foreground outline-none transition-colors
              placeholder:text-muted-foreground
              focus:ring-2 focus:ring-ring/20
              disabled:cursor-default disabled:bg-muted/30 disabled:opacity-80
              ${errors.channelName ? 'border-destructive focus:ring-destructive/20' : 'border-border focus:border-primary/60'}
            `}
          />
        </FormField>

        {/* Endpoint base SSO (solo lectura) */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <span className="text-sm font-semibold text-foreground">Endpoint base SSO</span>
          </div>
          <div
            className="flex h-9 items-center rounded-md border border-dashed border-border bg-muted/20 px-3"
            role="textbox"
            aria-readonly="true"
            aria-label="Endpoint base SSO"
          >
            <span className="truncate font-mono text-xs text-muted-foreground">
              {FIXED_AUTH_ENDPOINT}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Endpoint fijo — no modificable. Se usa con{' '}
            <code className="rounded bg-muted px-1 text-[10px]">POST</code> y cabecera{' '}
            <code className="rounded bg-muted px-1 text-[10px]">Authorization: Token</code>
          </p>
        </div>

        {/* Auth Token */}
        <ProtectedField
          id="sso-auth-token"
          label="Auth Token"
          value={originals.authToken}
          draftValue={watch('authToken')}
          description="Token de autorización para la cabecera HTTP del flujo SSO."
          mode={getMode('authToken')}
          error={errors.authToken?.message}
          onStartEdit={() => handleStartEdit('authToken')}
          onCancelEdit={() => handleCancelEdit('authToken')}
          onChange={(v) => setValue('authToken', v, { shouldDirty: true, shouldTouch: true })}
          reserveMessageSpace
        />

        {/* Channel ID */}
        <ProtectedField
          id="sso-channel-id"
          label="Channel ID"
          value={originals.channelId}
          draftValue={watch('channelId')}
          description="Identificador del canal (campo channel_id en el body SSO)."
          mode={getMode('channelId')}
          error={errors.channelId?.message}
          onStartEdit={() => handleStartEdit('channelId')}
          onCancelEdit={() => handleCancelEdit('channelId')}
          onChange={(v) => setValue('channelId', v, { shouldDirty: true, shouldTouch: true })}
          reserveMessageSpace
        />

        {/* Channel Secret */}
        <ProtectedField
          id="sso-channel-secret"
          label="Channel Secret"
          value={originals.channelSecret}
          draftValue={watch('channelSecret')}
          description="Secreto del canal (campo secret en el body SSO)."
          mode={getMode('channelSecret')}
          error={errors.channelSecret?.message}
          onStartEdit={() => handleStartEdit('channelSecret')}
          onCancelEdit={() => handleCancelEdit('channelSecret')}
          onChange={(v) => setValue('channelSecret', v, { shouldDirty: true, shouldTouch: true })}
          reserveMessageSpace
        />
      </div>

      {isEditMode && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
          <p className="text-xs text-foreground">
            <span className="font-semibold">Modo edición:</span> Los campos protegidos solo se actualizan si haces clic en ellos y escribes un nuevo valor. Los que no edites permanecen sin cambios.
          </p>
        </div>
      )}
    </FormSection>
  );
}
