import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useAppToast } from '@/components/ui/app-toast-provider';
import { button as Button } from '@/components/ui/button';
import { useAuthUser } from '@/hooks/use-auth-user';
import { ROLE_ADMIN_TI } from '@/auth/auth-user';
import { buildSsoPageSchema } from '@/lib/elibro-sso-page-schemas';
import {
  getActiveElibroConfig,
  updateElibroConfig,
  createElibroConfig,
  validateElibroConfig,
} from '@/lib/api/elibro-api';

import { SsoConfigHeader } from '../components/elibro-sso/SsoConfigHeader';
import { SsoStatusOverviewCard } from '../components/elibro-sso/SsoStatusOverviewCard';
import { SsoCredentialsCard } from '../components/elibro-sso/SsoCredentialsCard';
import { SsoSecurityCard } from '../components/elibro-sso/SsoSecurityCard';
import { SsoValidationCard } from '../components/elibro-sso/SsoValidationCard';
import type {
  SsoConfigViewState,
  SsoEditingFields,
  SsoFormValues,
  SsoProtectedKey,
  SsoProtectedOriginals,
} from '../components/elibro-sso/elibro-sso.types';
import {
  EMPTY_EDITING,
  FIXED_AUTH_ENDPOINT,
  SSO_PROTECTED_KEYS,
} from '../components/elibro-sso/elibro-sso.types';

// ---------------------------------------------------------------------------
// Mock state — reemplazar con llamadas reales al activar backend
// ---------------------------------------------------------------------------
const MOCK_CONFIG: SsoConfigViewState = {
  id: 'cfg-elibro-mock-001',
  channelName: 'ITSLP-2024',
  authEndpoint: FIXED_AUTH_ENDPOINT,
  active: true,
  validationStatus: 'VALID',
  validationMessage: 'Autenticación SSO verificada. Ticket generado correctamente en el último chequeo.',
  lastValidatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  updatedByAdminId: null,
  createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
};

const USE_MOCK = true; // Cambiar a false para conectar con backend real

function toOriginals(configExists: boolean): SsoProtectedOriginals {
  const sentinel = configExists ? '__configured__' : '';
  return { authToken: sentinel, channelId: sentinel, channelSecret: sentinel };
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------
export default function ElibroSsoConfig() {
  const { showToast } = useAppToast();
  const authUser = useAuthUser();
  const canEdit = USE_MOCK || authUser?.role === ROLE_ADMIN_TI;

  const [config, setConfig] = useState<SsoConfigViewState | null>(USE_MOCK ? MOCK_CONFIG : null);
  const [originals, setOriginals] = useState<SsoProtectedOriginals>(() =>
    toOriginals(USE_MOCK ? !!MOCK_CONFIG.id : false),
  );
  const [editingFields, setEditingFields] = useState<SsoEditingFields>(EMPTY_EDITING);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isLoading, setIsLoading] = useState(!USE_MOCK);

  const isUpdate = !!config?.id;
  const initialChannelName = config?.channelName ?? '';

  // Cargar desde backend si no usamos mock
  useEffect(() => {
    if (USE_MOCK) return;
    setIsLoading(true);
    getActiveElibroConfig()
      .then((res) => {
        setConfig(res as unknown as SsoConfigViewState);
        setOriginals(toOriginals(true));
      })
      .catch(() => {
        setConfig(null);
        setOriginals(toOriginals(false));
      })
      .finally(() => setIsLoading(false));
  }, []);

  const schema = useMemo(
    () =>
      buildSsoPageSchema({
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
  } = useForm<SsoFormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      channelName: initialChannelName,
      authToken: '',
      channelId: '',
      channelSecret: '',
    },
  });

  // Sincronizar cuando config cambia
  useEffect(() => {
    reset({
      channelName: config?.channelName ?? '',
      authToken: '',
      channelId: '',
      channelSecret: '',
    });
    setOriginals(toOriginals(!!config?.id));
    setEditingFields(EMPTY_EDITING);
  }, [config, reset]);

  // -----------------------------------------------------------------------
  // Handlers de campos protegidos
  // -----------------------------------------------------------------------
  const handleStartEdit = (key: SsoProtectedKey) => {
    setEditingFields((prev) => ({ ...prev, [key]: true }));
    setValue(key, '');
  };

  const handleCancelEdit = (key: SsoProtectedKey) => {
    setEditingFields((prev) => ({ ...prev, [key]: false }));
    setValue(key, '');
  };

  // -----------------------------------------------------------------------
  // Activar / cancelar modo edición (solo ROLE_ADMIN_TI)
  // -----------------------------------------------------------------------
  const handleEnterEdit = () => {
    if (!canEdit) return;
    setIsEditMode(true);
  };

  const handleCancelEdit_ = () => {
    setIsEditMode(false);
    setEditingFields(EMPTY_EDITING);
    reset({
      channelName: config?.channelName ?? '',
      authToken: '',
      channelId: '',
      channelSecret: '',
    });
  };

  // -----------------------------------------------------------------------
  // Guardar
  // -----------------------------------------------------------------------
  const onSubmit = async (values: SsoFormValues) => {
    const valid = await trigger();
    if (!valid) return;

    try {
      if (USE_MOCK) {
        // Simular guardado
        await new Promise((r) => setTimeout(r, 800));
        setConfig((prev) =>
          prev
            ? { ...prev, channelName: values.channelName.trim(), updatedAt: new Date().toISOString() }
            : prev,
        );
        showToast({
          severity: 'success',
          title: 'Configuración guardada (mock)',
          description: 'Los cambios se persistieron localmente. Conecta con el backend para guardar de verdad.',
        });
      } else {
        const saved = isUpdate
          ? await updateElibroConfig(config!.id, {
              ...(values.channelName.trim() !== initialChannelName ? { channelName: values.channelName.trim() } : {}),
              ...(editingFields.authToken && values.authToken.trim() ? { authToken: values.authToken.trim() } : {}),
              ...(editingFields.channelId && values.channelId.trim() ? { channelId: values.channelId.trim() } : {}),
              ...(editingFields.channelSecret && values.channelSecret.trim()
                ? { channelSecret: values.channelSecret.trim() }
                : {}),
            })
          : await createElibroConfig({
              channelName: values.channelName.trim(),
              authToken: values.authToken.trim(),
              channelId: values.channelId.trim(),
              channelSecret: values.channelSecret.trim(),
              authEndpoint: FIXED_AUTH_ENDPOINT,
              active: true,
            });

        setConfig(saved as unknown as SsoConfigViewState);
        setOriginals(toOriginals(true));
        showToast({
          severity: 'success',
          title: 'Configuración guardada',
          description: isUpdate
            ? 'Los campos editados fueron actualizados correctamente.'
            : 'Configuración SSO creada y activada.',
        });
      }

      setEditingFields(EMPTY_EDITING);
      setIsEditMode(false);
    } catch (err) {
      showToast({
        severity: 'error',
        title: 'No se pudo guardar',
        description: err instanceof Error ? err.message : 'Error al guardar la configuración.',
      });
    }
  };

  // -----------------------------------------------------------------------
  // Validar conexión
  // -----------------------------------------------------------------------
  const handleValidate = async () => {
    if (!config?.id || isValidating) return;
    setIsValidating(true);

    try {
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 1200));
        setConfig((prev) =>
          prev
            ? { ...prev, validationStatus: 'VALID', lastValidatedAt: new Date().toISOString(), validationMessage: 'Conexión verificada exitosamente (mock).' }
            : prev,
        );
        showToast({ severity: 'success', title: 'Validación exitosa (mock)', description: 'La conexión SSO responde correctamente.' });
      } else {
        const res = await validateElibroConfig(config.id);
        setConfig((prev) =>
          prev
            ? {
                ...prev,
                validationStatus: res.validationStatus,
                validationMessage: res.validationMessage,
                lastValidatedAt: res.lastValidatedAt,
              }
            : prev,
        );
        showToast({
          severity: res.validationStatus === 'VALID' ? 'success' : 'warning',
          title: res.validationStatus === 'VALID' ? 'Conexión verificada' : 'Validación con observaciones',
          description: res.validationMessage ?? undefined,
        });
      }
    } catch (err) {
      showToast({
        severity: 'error',
        title: 'No se pudo validar',
        description: err instanceof Error ? err.message : 'Error al validar la configuración.',
      });
    } finally {
      setIsValidating(false);
    }
  };

  // -----------------------------------------------------------------------
  // Determinar si el botón guardar está habilitado
  // -----------------------------------------------------------------------
  const channelName = watch('channelName');
  const hasNameChange = channelName?.trim() !== initialChannelName.trim();
  const hasSecretEdits = SSO_PROTECTED_KEYS.some((k) => editingFields[k]);
  const canSave = !isSubmitting && (isUpdate ? hasNameChange || hasSecretEdits : true);

  // -----------------------------------------------------------------------
  // Loading
  // -----------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Cargando configuración SSO…</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); void handleSubmit(onSubmit)(); }}
      noValidate
      className="flex flex-col gap-6"
    >
      {/* 1. Header */}
      <SsoConfigHeader
        config={config}
        isEditMode={isEditMode}
        isValidating={isValidating}
        canEdit={canEdit}
        onEdit={handleEnterEdit}
        onValidate={() => void handleValidate()}
      />

      {/* 2. Estado general (full width) */}
      <SsoStatusOverviewCard config={config} />

      {/* 3. Grid principal */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Columna izquierda: credenciales */}
        <div className="lg:col-span-2">
          <SsoCredentialsCard
            isEditMode={isEditMode}
            editingFields={editingFields}
            originals={originals}
            register={register}
            errors={errors}
            watch={watch}
            setValue={setValue}
            onStartEdit={handleStartEdit}
            onCancelEdit={handleCancelEdit}
          />
        </div>

        {/* Columna derecha: seguridad + validación */}
        <div className="flex flex-col gap-6">
          <SsoSecurityCard />
          <SsoValidationCard
            config={config}
            isValidating={isValidating}
            onValidate={() => void handleValidate()}
          />
        </div>
      </div>

      {/* 4. Barra de acciones (solo en modo edición) */}
      {isEditMode && (
        <div className="sticky bottom-0 z-10 -mx-1 rounded-xl border border-border bg-card/95 px-6 py-4 shadow-lg backdrop-blur-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Los secretos no editados permanecen sin cambios en el servidor.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelEdit_}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
                disabled={!canSave}
              >
                {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
