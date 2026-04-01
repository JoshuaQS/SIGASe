'use client';

import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Activity, BookOpen, Pencil, RefreshCw, ShieldCheck, TimerReset, Wifi } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import type { ElibroConfigResponse } from '@/types/api';
import {
  createElibroConfig,
  getActiveElibroConfig,
  updateElibroConfig,
  validateElibroConfig,
} from '@/lib/api/elibro-api';
import { useAppToast } from '@/components/ui/app-toast-provider';
import { Badge } from '@/components/ui/badge';
import { ProtectedField, type ProtectedFieldMode } from '@/components/ui/forms/protected-field';
import { button as Button } from '@/components/ui/button';
import {
  ModalFormBody,
  ModalFormFooter,
  ModalFormHeader,
  modalFormShellClass,
} from '@/components/ui/forms/modalFormPrimitives';
import {
  buildElibroConfigSchema,
  type ElibroConfigFormValues,
} from '@/lib/elibro-config-schemas';

type ElibroConfigModalProps = {
  initialConfig: ElibroConfigResponse | null;
  onSaved?: (config: ElibroConfigResponse) => void;
  onClose?: () => void;
};

type ProtectedKey = 'authToken' | 'clientId' | 'clientSecret';
type ProtectedConfig = Record<ProtectedKey, string>;
type EditingFields = Record<ProtectedKey, boolean>;

const PROTECTED_KEYS: ProtectedKey[] = ['authToken', 'clientId', 'clientSecret'];
const FIXED_AUTH_ENDPOINT = 'https://auth.elibro.net/auth/sso/';

const EMPTY_DRAFT: ProtectedConfig = {
  authToken: '',
  clientId: '',
  clientSecret: '',
};

const EMPTY_EDITING: EditingFields = {
  authToken: false,
  clientId: false,
  clientSecret: false,
};

function toOriginalConfig(initialConfig: ElibroConfigResponse | null): ProtectedConfig {
  return {
    authToken: initialConfig?.id ? '__configured__' : '',
    clientId: initialConfig?.id ? '__configured__' : '',
    clientSecret: initialConfig?.id ? '__configured__' : '',
  };
}

function IconMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function ElibroConfigModal({ initialConfig, onSaved, onClose }: ElibroConfigModalProps) {
  const { showToast } = useAppToast();

  const [originalConfig, setOriginalConfig] = useState<ProtectedConfig>(() => toOriginalConfig(initialConfig));
  const [editingFields, setEditingFields] = useState<EditingFields>(EMPTY_EDITING);
  const [isEditMode, setIsEditMode] = useState(false);
  const [validationStatus, setValidationStatus] = useState(initialConfig?.validationStatus ?? 'NOT_VALIDATED');
  const [validationMessage, setValidationMessage] = useState<string | null>(initialConfig?.validationMessage ?? null);
  const [lastValidatedAt, setLastValidatedAt] = useState<string | null>(initialConfig?.lastValidatedAt ?? null);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const isUpdate = Boolean(initialConfig?.id);
  const initialChannelName = initialConfig?.channelName ?? '';

  const schema = useMemo(
    () =>
      buildElibroConfigSchema({
        mode: isUpdate ? 'update' : 'create',
        editingFields,
        initialChannelName,
      }),
    [editingFields, initialChannelName, isUpdate],
  );

  const {
    register,
    watch,
    setValue,
    reset,
    trigger,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ElibroConfigFormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      channelName: initialChannelName,
      authToken: '',
      clientId: '',
      clientSecret: '',
    },
  });

  const channelName = watch('channelName');
  const draftConfig: ProtectedConfig = {
    authToken: watch('authToken') ?? '',
    clientId: watch('clientId') ?? '',
    clientSecret: watch('clientSecret') ?? '',
  };
  const hasChannelNameChange = channelName.trim() !== initialChannelName.trim();
  const canSave = !isSubmitting && (isUpdate ? (hasChannelNameChange || Object.values(editingFields).some(Boolean)) : true);
  const validationLabel =
    validationStatus === 'VALID'
      ? 'Conectado'
      : validationStatus === 'INVALID'
        ? 'Inválido'
        : 'Por validar';
  const validationBadgeVariant =
    validationStatus === 'VALID'
      ? 'success'
      : validationStatus === 'INVALID'
        ? 'destructive'
        : 'secondary';
  const validationDotClass =
    validationStatus === 'VALID'
      ? 'bg-success'
      : validationStatus === 'INVALID'
        ? 'bg-destructive'
        : 'bg-muted-foreground';

  useEffect(() => {
    setOriginalConfig(toOriginalConfig(initialConfig));
    setEditingFields(EMPTY_EDITING);
    setIsEditMode(false);
    setValidationStatus(initialConfig?.validationStatus ?? 'NOT_VALIDATED');
    setValidationMessage(initialConfig?.validationMessage ?? null);
    setLastValidatedAt(initialConfig?.lastValidatedAt ?? null);
    reset({
      channelName: initialConfig?.channelName ?? '',
      authToken: '',
      clientId: '',
      clientSecret: '',
    });
  }, [initialConfig, reset]);

  const getFieldMode = (key: ProtectedKey): ProtectedFieldMode => {
    if (editingFields[key]) return 'editing';
    if (isEditMode) return 'select';
    return 'view';
  };

  const startFieldEdit = (key: ProtectedKey) => {
    if (!isEditMode) return;
    setEditingFields((prev) => ({ ...prev, [key]: true }));
    // Nunca precargamos valor real en el input de edición.
    setValue(key, '');
  };

  const cancelFieldEdit = (key: ProtectedKey) => {
    setEditingFields((prev) => ({ ...prev, [key]: false }));
    // Cancelar limpia draft temporal sin tocar estado persistido.
    setValue(key, '');
  };

  const updateDraftValue = (key: ProtectedKey, next: string) => {
    setValue(key, next, { shouldDirty: true, shouldTouch: true });
  };

  const handleModalCancel = () => {
    setIsEditMode(false);
    setEditingFields(EMPTY_EDITING);
    reset({
      channelName: initialConfig?.channelName ?? '',
      authToken: '',
      clientId: '',
      clientSecret: '',
    });
    onClose?.();
  };

  const handleToggleEditMode = () => {
    if (isEditMode) {
      setEditingFields(EMPTY_EDITING);
      reset({
        channelName: initialConfig?.channelName ?? '',
        authToken: '',
        clientId: '',
        clientSecret: '',
      });
      setIsEditMode(false);
      return;
    }
    setIsEditMode(true);
  };

  const onSubmit = async (values: ElibroConfigFormValues) => {
    const isValid = await trigger();
    if (!isValid) return;

    try {
      const saved = isUpdate
        ? await updateElibroConfig(initialConfig!.id, {
          ...(editingFields.authToken && values.authToken.trim().length > 0
            ? { authToken: values.authToken.trim() }
            : {}),
          ...(editingFields.clientId && values.clientId.trim().length > 0
            ? { channelId: values.clientId.trim() }
            : {}),
          ...(editingFields.clientSecret && values.clientSecret.trim().length > 0
            ? { channelSecret: values.clientSecret.trim() }
            : {}),
          ...(values.channelName.trim() !== initialChannelName.trim()
            ? { channelName: values.channelName.trim() }
            : {}),
        })
        : await createElibroConfig({
          authToken: values.authToken.trim(),
          channelId: values.clientId.trim(),
          channelSecret: values.clientSecret.trim(),
          channelName: values.channelName.trim(),
          authEndpoint: FIXED_AUTH_ENDPOINT,
          active: true,
        });

      setOriginalConfig(toOriginalConfig(saved));
      setEditingFields(EMPTY_EDITING);
      setIsEditMode(false);
      setValidationStatus(saved.validationStatus);
      setValidationMessage(saved.validationMessage);
      setLastValidatedAt(saved.lastValidatedAt);
      reset({
        channelName: saved.channelName ?? '',
        authToken: '',
        clientId: '',
        clientSecret: '',
      });
      onSaved?.(saved);

      showToast({
        severity: 'success',
        title: 'Configuración guardada',
        description: isUpdate
          ? 'Se actualizaron los campos editados y la configuración quedó persistida.'
          : 'Configuración creada y guardada correctamente.',
      });
      onClose?.();
    } catch (error) {
      showToast({
        severity: 'error',
        title: 'No se pudo guardar',
        description: error instanceof Error ? error.message : 'Error al guardar configuración.',
      });
    }
  };

  const handleRefreshValidation = async () => {
    if (!initialConfig?.id || isRefreshingStatus) return;
    setIsRefreshingStatus(true);
    try {
      const validation = await validateElibroConfig(initialConfig.id);
      setValidationStatus(validation.validationStatus);
      setValidationMessage(validation.validationMessage);
      setLastValidatedAt(validation.lastValidatedAt);

      try {
        const active = await getActiveElibroConfig();
        setOriginalConfig(toOriginalConfig(active));
        setValue('channelName', active.channelName ?? '', { shouldDirty: false });
        onSaved?.(active);
      } catch {
        // Ignorado: ya tenemos estado de validación actualizado.
      }

      showToast({
        severity: validation.validationStatus === 'VALID' ? 'success' : 'warning',
        title: validation.validationStatus === 'VALID' ? 'Credenciales válidas' : 'Validación con observaciones',
        description:
          validation.validationStatus === 'VALID'
            ? 'La integración sigue activa y las credenciales están vigentes.'
            : validation.validationMessage || 'Se detectaron problemas en la conexión o credenciales.',
      });
    } catch (error) {
      showToast({
        severity: 'error',
        title: 'No se pudo validar',
        description: error instanceof Error ? error.message : 'Error al validar la configuración.',
      });
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  return (
    <div className={`${modalFormShellClass} mx-auto max-w-3xl`}>
      <ModalFormHeader
        avatar={<BookOpen className="h-5 w-5" />}
        avatarRingClassName="rounded-xl bg-primary/10 text-primary ring-0"
        title="Configuración eLibro"
        subtitle={
          <>
            <span className="font-mono">integration/elibro</span> · Credenciales y parámetros operativos
          </>
        }
        badges={
          <>
            <Badge variant={(initialConfig?.active ?? true) ? 'success' : 'secondary'} dotClassName={(initialConfig?.active ?? true) ? 'bg-success' : 'bg-muted-foreground'}>
              {(initialConfig?.active ?? true) ? 'Activa' : 'Inactiva'}
            </Badge>
          </>
        }
      />

      <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
        <ModalFormBody className="space-y-5 p-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Credenciales y conexión
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleToggleEditMode}
              className="h-7 rounded-md px-2 text-[11px] font-semibold"
              leftIcon={<Pencil className="h-3.5 w-3.5" />}
            >
              Editar
            </Button>
          </div>

          {isEditMode && (
            <div className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2">
              <p className="text-xs text-foreground">
                Modo edición activo: puedes actualizar uno o varios campos sensibles; solo se enviarán los que edites.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Channel Name</label>
            <input
              type="text"
              {...register('channelName')}
              disabled={!isEditMode}
              placeholder={isEditMode ? 'Escribe el nombre del canal' : 'Sin configurar'}
              className={`h-9 w-full rounded-md border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-80 ${errors.channelName ? 'border-destructive focus:border-destructive' : 'border-border focus:border-primary'
                }`}
            />
            {errors.channelName?.message ? (
              <p className="text-[11px] text-destructive">{errors.channelName.message}</p>
            ) : null}
          </div>

          <ProtectedField
            label="Auth Token"
            value={originalConfig.authToken}
            draftValue={draftConfig.authToken}
            description="Valor protegido. Nunca se muestra el token real guardado."
            mode={getFieldMode('authToken')}
            error={errors.authToken?.message}
            onStartEdit={() => startFieldEdit('authToken')}
            onCancelEdit={() => cancelFieldEdit('authToken')}
            onChange={(next) => updateDraftValue('authToken', next)}
          />

          <ProtectedField
            label="Client ID"
            value={originalConfig.clientId}
            draftValue={draftConfig.clientId}
            description="Valor protegido. Nunca se muestra el Client ID real guardado."
            mode={getFieldMode('clientId')}
            error={errors.clientId?.message}
            onStartEdit={() => startFieldEdit('clientId')}
            onCancelEdit={() => cancelFieldEdit('clientId')}
            onChange={(next) => updateDraftValue('clientId', next)}
          />

          <ProtectedField
            label="Client Secret"
            value={originalConfig.clientSecret}
            draftValue={draftConfig.clientSecret}
            description="Valor protegido. Nunca se muestra el secreto actual."
            mode={getFieldMode('clientSecret')}
            error={errors.clientSecret?.message}
            onStartEdit={() => startFieldEdit('clientSecret')}
            onCancelEdit={() => cancelFieldEdit('clientSecret')}
            onChange={(next) => updateDraftValue('clientSecret', next)}
          />
        </ModalFormBody>

        <div className="space-y-6 p-6">
          <div>
            <div className="mb-4 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado del sistema</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void handleRefreshValidation()}
                disabled={!initialConfig?.id || isRefreshingStatus}
                className="h-7 rounded-md px-2 text-[11px] font-semibold"
                leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${isRefreshingStatus ? 'animate-spin' : ''}`} />}
              >
                Actualizar
              </Button>
            </div>
            <div className="rounded-xl border border-border bg-secondary/40 p-4">
              <div className="mb-2 flex flex-col items-start gap-1">
                <Badge variant={validationBadgeVariant} dotClassName={validationDotClass}>
                  {validationLabel}
                </Badge>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Wifi className="h-3 w-3" />
                  {lastValidatedAt
                    ? `Último check: ${new Date(lastValidatedAt).toLocaleString()}`
                    : 'Sin validación reciente'}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {validationMessage || 'Aún no hay validación de backend para esta configuración.'}
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Métricas rápidas</p>
            <div className="space-y-3.5">
              <IconMetric icon={Activity} label="Estado validación" value={validationStatus ?? 'SIN_DATOS'} />
              <IconMetric icon={TimerReset} label="Última validación" value={lastValidatedAt ? new Date(lastValidatedAt).toLocaleString() : 'Sin registro'} />
              <IconMetric icon={ShieldCheck} label="Configuración" value={initialConfig?.id ? 'Existente' : 'Pendiente'} />
            </div>
          </div>
        </div>
      </div>

      <ModalFormFooter className="justify-between">
        <p className="w-full text-xs text-muted-foreground md:w-auto md:pr-4">
          Los secretos sensibles se almacenan cifrados en backend.
        </p>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={handleModalCancel}
            className="h-9 rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() => void handleSubmit(onSubmit)()}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </div>
      </ModalFormFooter>
    </div>
  );
}
