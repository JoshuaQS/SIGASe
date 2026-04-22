import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Settings, Cable, Save, Loader2, AlertTriangle, Trash2, Info, Lock } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { ProtectedField } from '@/shared/components/ui/forms/protected-field'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { useAppToast } from '@/shared/components/ui/app-toast-provider'
import { AppConfirmDialog } from '@/shared/components/ui/confirmation-dialog'
import { ApiClientError } from '@/shared/lib/http/api-client'
import {
  activateElibroConfig,
  createElibroConfig,
  getElibroConfigs,
  updateElibroConfig,
  deleteElibroConfig,
  type ElibroDraftValidationRequest,
  type ElibroConfigResponse,
} from '@/features/elibro-config/api/elibro-config-api'

const DEFAULT_NEXT_URL = ''

type EditMode = 'view' | 'choose' | 'create' | 'edit-current'

type CredentialsFormState = {
  name: string
  nextUrl: string
  channelName: string
  authToken: string
  channelId: string
  channelSecret: string
}

type ValidationState = {
  status: 'idle' | 'loading' | 'success' | 'error'
  message: string
  latency?: number
  checkedAt?: string
}

interface ElibroCredentialsStaticCardProps {
  onConfigChanged?: () => Promise<void> | void
  onValidationStateChange?: (next: ValidationState) => void
  onSelectedConfigChange?: (configId: string | null) => void
  onValidateConnection?: (payload: ElibroDraftValidationRequest) => Promise<void>
  isValidationLoading?: boolean
  validationRefreshKey?: number
  endpoint: string
}

function toInitialFormState(config: ElibroConfigResponse | null): CredentialsFormState {
  return {
    name: config?.name ?? '',
    nextUrl: config?.nextUrl ?? DEFAULT_NEXT_URL,
    channelName: config?.channelName ?? '',
    authToken: '',
    channelId: '',
    channelSecret: '',
  }
}

function formatDateTime(iso?: string | null) {
  if (!iso) return 'Sin datos'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Sin datos'
  return date.toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatClock(iso?: string | null) {
  if (!iso) return 'Sin datos'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Sin datos'
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

export function ElibroCredentialsStaticCard({
  onConfigChanged,
  onValidationStateChange,
  onSelectedConfigChange,
  onValidateConnection,
  isValidationLoading = false,
  validationRefreshKey = 0,
  endpoint,
}: ElibroCredentialsStaticCardProps) {
  const { showToast } = useAppToast()
  const [configs, setConfigs] = useState<ElibroConfigResponse[]>([])
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null)
  const [mode, setMode] = useState<EditMode>('view')
  const [form, setForm] = useState<CredentialsFormState>(() => toInitialFormState(null))
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isStatusChanging, setIsStatusChanging] = useState(false)

  const secondaryActionButtonClass = 'min-w-[170px] justify-center gap-2'

  const selectedConfig = useMemo(
    () => (selectedConfigId ? configs.find((item) => item.id === selectedConfigId) ?? null : null),
    [configs, selectedConfigId],
  )
  const isFormEditable = mode === 'create' || mode === 'edit-current'
  const hasConfigs = configs.length > 0
  const hasActiveConfig = configs.some((config) => config.status === 'ACTIVE')
  const protectedDisplayState = hasActiveConfig ? 'protected' : 'pending'
  const hasDraftCredentials = Boolean(form.authToken.trim() && form.channelId.trim() && form.channelSecret.trim())
  const shouldShowValidateButton = isFormEditable
  const canValidateDraft = isFormEditable && hasDraftCredentials && !isLoadingConfigs && !isValidationLoading && !isSaving

  const connectionBadge = useMemo(() => {
    if (!selectedConfig) {
      return {
        icon: AlertTriangle,
        text: 'Sin configuración seleccionada',
        className: 'text-amber-600',
      }
    }
    if (selectedConfig.validationStatus === 'VALID') {
      return {
        icon: CheckCircle2,
        text: 'Conexión válida',
        className: 'text-success',
      }
    }
    return {
      icon: AlertTriangle,
      text: 'Pendiente de validación',
      className: 'text-amber-600',
    }
  }, [selectedConfig])

  const syncForm = useCallback((config: ElibroConfigResponse | null) => {
    setForm(toInitialFormState(config))
  }, [])

  const syncValidationPanel = useCallback((config: ElibroConfigResponse | null) => {
    if (!onValidationStateChange) return
    if (!config) {
      onValidationStateChange({ status: 'idle', message: 'Sin validación activa.' })
      return
    }

    const mappedStatus: ValidationState['status'] = (
      config.validationStatus === 'VALID'
        ? 'success'
        : config.validationStatus === 'INVALID'
          ? 'error'
          : 'idle'
    )
    onValidationStateChange({
      status: mappedStatus,
      message: config.validationMessage ?? 'Sin validación activa.',
      checkedAt: formatClock(config.lastValidatedAt),
    })
  }, [onValidationStateChange])

  const loadConfigs = useCallback(async (options?: { silent?: boolean; preferredConfigId?: string | null }) => {
    try {
      setIsLoadingConfigs(true)
      const list = await getElibroConfigs()
      setConfigs(list)

      const previousSelectedId = options?.preferredConfigId ?? selectedConfigId
      const hasPrevious = previousSelectedId ? list.some((item) => item.id === previousSelectedId) : false
      const fallbackId = list.find((item) => item.status === 'ACTIVE')?.id ?? list[0]?.id ?? null
      const nextSelectedId = hasPrevious ? previousSelectedId : fallbackId
      const nextSelectedConfig = nextSelectedId ? list.find((item) => item.id === nextSelectedId) ?? null : null

      setSelectedConfigId(nextSelectedId)
      syncForm(nextSelectedConfig)
      syncValidationPanel(nextSelectedConfig)
      if (!options?.silent) {
        setMode('view')
      }
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404) {
        setConfigs([])
        setSelectedConfigId(null)
        syncForm(null)
        syncValidationPanel(null)
        if (!options?.silent) {
          setMode('view')
        }
        return
      }

      const message = error instanceof Error ? error.message : 'No se pudo cargar la configuración activa de eLibro.'
      showToast({
        severity: 'error',
        title: 'Error al cargar configuración',
        description: message,
      })
    } finally {
      setIsLoadingConfigs(false)
    }
  }, [selectedConfigId, showToast, syncForm, syncValidationPanel])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadConfigs()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadConfigs])

  const updateField = (field: keyof CredentialsFormState, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  const handleEditClick = () => {
    setMode((previous) => (previous === 'choose' ? 'view' : 'choose'))
  }

  const handleCancelEditing = () => {
    if (!hasConfigs) {
      syncForm(null)
      syncValidationPanel(null)
      setMode('view')
      onSelectedConfigChange?.(null)
      return
    }

    syncForm(selectedConfig)
    syncValidationPanel(selectedConfig)
    setMode('view')
    onSelectedConfigChange?.(selectedConfig?.id ?? null)
  }

  const handleSelectConfig = (config: ElibroConfigResponse) => {
    setSelectedConfigId(config.id)
    onSelectedConfigChange?.(config.id)
    syncForm(config)
    syncValidationPanel(config)
    setMode('view')
  }

  const startCreateMode = () => {
    setMode('create')
    onSelectedConfigChange?.(null)
    syncForm(null)
    syncValidationPanel(null)
  }

  const startEditCurrentMode = () => {
    if (!selectedConfig) {
      showToast({
        severity: 'warning',
        title: 'Sin configuración seleccionada',
        description: 'Selecciona una configuración para poder editarla.',
      })
      return
    }
    setMode('edit-current')
    onSelectedConfigChange?.(null)
    syncForm(selectedConfig)
  }

  const handleSave = async () => {
    const name = form.name.trim()
    const nextUrl = form.nextUrl.trim()
    const channelName = form.channelName.trim()
    const authToken = form.authToken.trim()
    const channelId = form.channelId.trim()
    const channelSecret = form.channelSecret.trim()

    if (!name || !channelName) {
      showToast({
        severity: 'warning',
        title: 'Campos incompletos',
        description: 'Nombre y channel name son obligatorios.',
      })
      return
    }

    if (mode === 'create' && (!authToken || !channelId || !channelSecret)) {
      showToast({
        severity: 'warning',
        title: 'Credenciales incompletas',
        description: 'Para crear una configuración nueva debes capturar todos los secretos.',
      })
      return
    }

    if (mode !== 'create' && mode !== 'edit-current') {
      return
    }

    setIsSaving(true)
    try {
      let saved: ElibroConfigResponse
      if (mode === 'create') {
        saved = await createElibroConfig({
          name,
          ...(nextUrl ? { nextUrl } : {}),
          channelName,
          authToken,
          channelId,
          channelSecret,
          status: 'INACTIVE',
        })
      } else {
        if (!selectedConfig?.id) {
          showToast({
            severity: 'warning',
            title: 'Sin configuración seleccionada',
            description: 'No hay configuración para actualizar.',
          })
          return
        }

        const patchPayload: Parameters<typeof updateElibroConfig>[1] = {}

        if (name && name !== selectedConfig.name) {
          patchPayload.name = name
        }
        const selectedNextUrl = selectedConfig.nextUrl?.trim() ?? ''
        if (nextUrl !== selectedNextUrl) {
          patchPayload.nextUrl = nextUrl
        }
        if (channelName && channelName !== selectedConfig.channelName) {
          patchPayload.channelName = channelName
        }
        if (authToken) {
          patchPayload.authToken = authToken
        }
        if (channelId) {
          patchPayload.channelId = channelId
        }
        if (channelSecret) {
          patchPayload.channelSecret = channelSecret
        }

        if (Object.keys(patchPayload).length === 0) {
          showToast({
            severity: 'info',
            title: 'Sin cambios por guardar',
            description: 'No detectamos cambios en la configuración seleccionada.',
          })
          return
        }

        saved = await updateElibroConfig(selectedConfig.id, patchPayload)
      }

      showToast({
        severity: 'success',
        title: mode === 'create' ? 'Configuración creada' : 'Configuración actualizada',
        description: 'Los datos se guardaron correctamente en backend.',
      })

      await loadConfigs({ preferredConfigId: saved.id })
      await onConfigChanged?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar la configuración de eLibro.'
      showToast({
        severity: 'error',
        title: 'Error al guardar configuración',
        description: message,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleActivateConfig = async (config: ElibroConfigResponse) => {
    if (config.status === 'ACTIVE') return

    setIsStatusChanging(true)
    try {
      await activateElibroConfig(config.id, { reason: 'Selección manual de configuración activa' })
      showToast({
        severity: 'success',
        title: 'Configuración activa actualizada',
        description: `Ahora está activa: ${config.name}.`,
      })
      await loadConfigs({ preferredConfigId: config.id })
      await onConfigChanged?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo activar la configuración.'
      showToast({
        severity: 'error',
        title: 'Error al activar configuración',
        description: message,
      })
    } finally {
      setIsStatusChanging(false)
    }
  }

  const handleValidateConnection = async () => {
    const authToken = form.authToken.trim()
    const channelId = form.channelId.trim()
    const channelSecret = form.channelSecret.trim()
    const nextUrl = form.nextUrl.trim()

    if (!isFormEditable) {
      showToast({
        severity: 'warning',
        title: 'Modo solo lectura',
        description: 'Para probar conexión, entra a crear o editar y captura las credenciales a evaluar.',
      })
      return
    }

    if (!authToken || !channelId || !channelSecret) {
      showToast({
        severity: 'warning',
        title: 'Credenciales incompletas',
        description: 'Probar conexión requiere Auth Token, Channel ID y Channel Secret en el formulario actual.',
      })
      return
    }

    const payload: ElibroDraftValidationRequest = {
      baseConfigId: mode === 'edit-current' ? selectedConfig?.id : undefined,
      authToken,
      channelId,
      channelSecret,
      ...(nextUrl ? { nextUrl } : {}),
    }
    await onValidateConnection?.(payload)
  }

  const handleDeleteCurrent = async () => {
    if (!selectedConfig?.id) return

    try {
      await deleteElibroConfig(selectedConfig.id)
      setIsDeleteConfirmOpen(false)
      showToast({
        severity: 'success',
        title: 'Configuración eliminada',
        description: 'La configuración seleccionada se eliminó correctamente.',
      })
      await loadConfigs()
      await onConfigChanged?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar la configuración.'
      showToast({
        severity: 'error',
        title: 'Error al eliminar configuración',
        description: message,
      })
    }
  }

  const ConnectionIcon = connectionBadge.icon

  useEffect(() => {
    if (!selectedConfig?.id || validationRefreshKey === 0) return
    void loadConfigs({ silent: true, preferredConfigId: selectedConfig.id })
  }, [loadConfigs, selectedConfig?.id, validationRefreshKey])

  useEffect(() => {
    if (isFormEditable) return
    onSelectedConfigChange?.(selectedConfig?.id ?? null)
  }, [isFormEditable, onSelectedConfigChange, selectedConfig?.id])

  return (
    <div className="flex gap-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <AppConfirmDialog
        open={isDeleteConfirmOpen}
        title="Eliminar configuración de eLibro"
        description="Esta acción eliminará la configuración seleccionada y no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        confirmColor="error"
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => void handleDeleteCurrent()}
      />

      <div className="w-56 shrink-0 border-r border-border bg-muted/30">
        <div className="border-b border-border/50 px-4 py-3.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Configuraciones</h3>
        </div>
        <div className="py-1">
          {isLoadingConfigs ? (
            <div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Cargando configuraciones...
            </div>
          ) : configs.length === 0 ? (
            <div className="px-4 py-3 text-xs text-muted-foreground">No hay configuraciones registradas.</div>
          ) : (
            configs.map((config) => {
              const isSelected = config.id === selectedConfigId
              return (
                <div
                  key={config.id}
                  className={`w-full border-l-[3px] px-3 py-2.5 ${isSelected ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-accent/40'}`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectConfig(config)}
                    className="w-full text-left"
                  >
                    <p className="text-sm font-medium text-foreground truncate">{config.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{formatDateTime(config.updatedAt)}</span>
                      {config.status === 'ACTIVE' ? (
                        <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[9px] font-medium text-success">Activa</span>
                      ) : (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">Inactiva</span>
                      )}
                    </div>
                  </button>
                  <div className="mt-2">
                    {config.status === 'ACTIVE' ? (
                      <span className="text-[10px] font-medium text-success">En uso para integraciones</span>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => void handleActivateConfig(config)}
                        disabled={isStatusChanging || isSaving || isLoadingConfigs || isValidationLoading}
                      >
                        Activar esta
                      </Button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="flex-1 p-4 lg:p-5">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground xl:text-lg">{form.name || 'Nueva configuración de eLibro'}</h2>
            <div className="mt-1.5 flex items-center gap-3">
              <span className={`flex items-center gap-1 text-xs ${connectionBadge.className}`}>
                <ConnectionIcon className="h-3 w-3" /> {connectionBadge.text}
              </span>
              <span className={`text-xs ${selectedConfig?.status === 'ACTIVE' ? 'text-success' : 'text-muted-foreground'}`}>
                {selectedConfig?.status === 'ACTIVE' ? 'Configuración activa (en uso)' : 'Configuración inactiva'}
              </span>
              {isFormEditable ? (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {mode === 'create' ? 'Creando nueva configuración' : 'Editando configuración'}
                </span>
              ) : null}
            </div>
          </div>
          {!hasConfigs ? (
            mode !== 'create' ? (
              <Button
                variant="outline"
                size="md"
                className={secondaryActionButtonClass}
                onClick={startCreateMode}
                disabled={isLoadingConfigs || isSaving}
              >
                <Settings className="w-3.5 h-3.5" /> Configurar
              </Button>
            ) : null
          ) : isFormEditable ? (
            <Button
              variant="outline"
              size="md"
              className={secondaryActionButtonClass}
              onClick={handleCancelEditing}
              disabled={isLoadingConfigs || isSaving || isValidationLoading}
            >
              Cancelar
            </Button>
          ) : (
            <Button
              variant="outline"
              size="md"
              className={secondaryActionButtonClass}
              onClick={handleEditClick}
              disabled={isLoadingConfigs || isSaving}
            >
              <Settings className="w-3.5 h-3.5" /> Editar configuración
            </Button>
          )}
        </div>

        {mode === 'choose' && !isFormEditable ? (
          <div className="mb-4 rounded-lg border border-border/60 bg-muted/20 p-3 flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={startCreateMode}>
              Crear configuración nueva
            </Button>
            <Button variant="outline" size="sm" onClick={startEditCurrentMode} disabled={!selectedConfig}>
              Editar configuración actual
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={() => setIsDeleteConfirmOpen(true)}
              disabled={!selectedConfig}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar configuración actual
            </Button>
          </div>
        ) : null}

        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <p className="text-xs font-medium text-muted-foreground">Nombre</p>
            <Input
              value={form.name}
              readOnly={!isFormEditable}
              onChange={(event) => updateField('name', event.target.value)}
              placeholder="Integración SSO - UTEZ"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium text-muted-foreground">Next URL permitida</p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground transition-colors hover:text-foreground" aria-label="Información sobre next">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={6}>
                    next es opcional; permite redirigir a un recurso específico dentro de eLibro después del SSO y no cambia el endpoint principal.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              value={form.nextUrl}
              readOnly={!isFormEditable}
              onChange={(event) => updateField('nextUrl', event.target.value)}
              placeholder="Opcional"
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Channel Name</p>
            <Input
              value={form.channelName}
              readOnly={!isFormEditable}
              onChange={(event) => updateField('channelName', event.target.value)}
              placeholder="utez"
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Channel ID</p>
            <ProtectedField
              mode={isFormEditable ? 'edit' : 'display'}
              value={isFormEditable ? form.channelId : ''}
              onChange={(value) => updateField('channelId', value)}
              placeholder={mode === 'edit-current' ? 'Dejar vacío para conservar el valor actual' : 'Channel ID'}
              readOnly={!isFormEditable}
              state={protectedDisplayState}
              label={!isFormEditable && selectedConfig?.channelIdMasked ? 'Channel ID configurado y protegido' : undefined}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Channel Secret</p>
            <ProtectedField
              mode={isFormEditable ? 'edit' : 'display'}
              value={isFormEditable ? form.channelSecret : ''}
              onChange={(value) => updateField('channelSecret', value)}
              placeholder={mode === 'edit-current' ? 'Dejar vacío para conservar el valor actual' : 'Channel Secret'}
              readOnly={!isFormEditable}
              state={protectedDisplayState}
              label={!isFormEditable && selectedConfig?.hasChannelSecret ? 'Channel Secret configurado y protegido' : undefined}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Auth Token</p>
            <ProtectedField
              mode={isFormEditable ? 'edit' : 'display'}
              value={isFormEditable ? form.authToken : ''}
              onChange={(value) => updateField('authToken', value)}
              placeholder={mode === 'edit-current' ? 'Dejar vacío para conservar el valor actual' : 'Token SSO'}
              readOnly={!isFormEditable}
              state={protectedDisplayState}
              label={!isFormEditable && selectedConfig?.hasAuthToken ? 'Token configurado y protegido' : undefined}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium text-muted-foreground">Endpoint SSO</p>
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <Input
              value={endpoint}
              readOnly
              className="font-mono text-xs"
              endAdornment={<Lock className="h-4 w-4" />}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 border-t border-border/50 pt-3">
          <div className="space-y-1">
            <span className="block text-[10px] text-muted-foreground">
              Actualizado: {formatDateTime(selectedConfig?.updatedAt)} por {selectedConfig?.updatedByName ?? 'N/D'}
            </span>
            {isFormEditable && !hasDraftCredentials ? (
              <span className="block text-[10px] text-amber-600">
                Para probar conexión captura Auth Token, Channel ID y Channel Secret en este formulario.
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {shouldShowValidateButton ? (
              <Button
                variant="outline"
                size="md"
                className={secondaryActionButtonClass}
                onClick={() => void handleValidateConnection()}
                disabled={!canValidateDraft}
                isLoading={isValidationLoading}
              >
                {!isValidationLoading ? <Cable className="w-3.5 h-3.5" /> : null}
                {isValidationLoading ? 'Probando conexión…' : 'Probar conexión'}
              </Button>
            ) : null}
            {isFormEditable ? (
              <>
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleCancelEditing}
                  disabled={isSaving || isLoadingConfigs || isValidationLoading}
                >
                  Cancelar
                </Button>
                <Button
                  size="md"
                  className="gap-2"
                  onClick={() => void handleSave()}
                  disabled={isSaving || isLoadingConfigs}
                  isLoading={isSaving}
                >
                  {!isSaving ? <Save className="w-3.5 h-3.5" /> : null}
                  {isSaving ? 'Configurando…' : 'Guardar'}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
