import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Settings, Cable, Save, Loader2, AlertTriangle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { ProtectedField } from '@/components/ui/forms/protected-field'
import { useAppToast } from '@/components/ui/app-toast-provider'
import { AppConfirmDialog } from '@/components/ui/confirmation-dialog'
import { ApiClientError } from '@/lib/api/api-client'
import {
  createElibroConfig,
  getElibroConfigs,
  updateElibroConfig,
  validateElibroConfig,
  deleteElibroConfig,
  type ElibroConfigResponse,
} from '@/lib/api/elibro-config-api'

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
}: ElibroCredentialsStaticCardProps) {
  const { showToast } = useAppToast()
  const [configs, setConfigs] = useState<ElibroConfigResponse[]>([])
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null)
  const [mode, setMode] = useState<EditMode>('view')
  const [form, setForm] = useState<CredentialsFormState>(() => toInitialFormState(null))
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)

  const secondaryActionButtonClass = 'min-w-[190px] justify-center gap-2'
  const isFormEditable = mode === 'create' || mode === 'edit-current'

  const selectedConfig = useMemo(
    () => (selectedConfigId ? configs.find((item) => item.id === selectedConfigId) ?? null : null),
    [configs, selectedConfigId],
  )
  const canValidate = Boolean(selectedConfig?.id) && !isValidating && !isLoadingConfigs

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

  const handleSelectConfig = (config: ElibroConfigResponse) => {
    setSelectedConfigId(config.id)
    syncForm(config)
    syncValidationPanel(config)
    setMode('view')
  }

  const startCreateMode = () => {
    setMode('create')
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
          status: 'ACTIVE',
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

        saved = await updateElibroConfig(selectedConfig.id, {
          name,
          nextUrl,
          channelName,
          ...(authToken ? { authToken } : {}),
          ...(channelId ? { channelId } : {}),
          ...(channelSecret ? { channelSecret } : {}),
        })
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

  const handleValidateConnection = async () => {
    if (!selectedConfig?.id) {
      showToast({
        severity: 'warning',
        title: 'Sin configuración seleccionada',
        description: 'Selecciona una configuración para validar.',
      })
      return
    }

    const pendingValidationState: ValidationState = {
      status: 'loading',
      message: 'Verificando conexión con eLibro…',
    }
    onValidationStateChange?.(pendingValidationState)

    setIsValidating(true)
    try {
      const result = await validateElibroConfig(selectedConfig.id)
      const isError = result.validationStatus === 'INVALID'
      const message = result.validationMessage || (isError ? 'La validación falló.' : 'Validación ejecutada correctamente.')

      const nextValidationState: ValidationState = {
        status: isError ? 'error' : 'success',
        message,
        latency: result.latencyMs ?? undefined,
        checkedAt: formatClock(result.lastValidatedAt),
      }
      onValidationStateChange?.(nextValidationState)

      if (isError) {
        showToast({
          severity: 'error',
          title: 'Validación con errores',
          description: message,
        })
      } else {
        const latencyLabel = result.latencyMs != null ? ` en ${result.latencyMs} ms` : ''
        showToast({
          severity: 'success',
          title: 'Conexión SSO validada',
          description: `Validación ejecutada${latencyLabel}.`,
        })
      }

      await loadConfigs({ silent: true, preferredConfigId: selectedConfig.id })
      await onConfigChanged?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo validar la conexión de eLibro.'
      onValidationStateChange?.({ status: 'error', message })
      showToast({
        severity: 'error',
        title: 'Error al validar conexión',
        description: message,
      })
    } finally {
      setIsValidating(false)
    }
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

  return (
    <div className="flex gap-0 rounded-xl border border-border overflow-hidden bg-card shadow-sm">
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

      <div className="w-64 border-r border-border bg-muted/30 shrink-0">
        <div className="px-4 py-4 border-b border-border/50">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Configuraciones</h3>
        </div>
        <div className="py-1">
          {isLoadingConfigs ? (
            <div className="px-4 py-4 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Cargando configuraciones...
            </div>
          ) : configs.length === 0 ? (
            <div className="px-4 py-4 text-xs text-muted-foreground">No hay configuraciones registradas.</div>
          ) : (
            configs.map((config) => {
              const isSelected = config.id === selectedConfigId
              return (
                <button
                  key={config.id}
                  type="button"
                  onClick={() => handleSelectConfig(config)}
                  className={`w-full text-left px-4 py-3 border-l-[3px] ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent hover:bg-accent/40'
                  }`}
                >
                  <p className="text-sm font-medium text-foreground truncate">{config.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">{formatDateTime(config.updatedAt)}</span>
                    {config.status === 'ACTIVE' ? (
                      <span className="text-[9px] font-medium text-success bg-success/10 px-1.5 py-0.5 rounded-full">Activa</span>
                    ) : (
                      <span className="text-[9px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">Inactiva</span>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      <div className="flex-1 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{form.name || 'Nueva configuración de eLibro'}</h2>
            <div className="flex items-center gap-3 mt-1.5">
              <span className={`flex items-center gap-1 text-xs ${connectionBadge.className}`}>
                <ConnectionIcon className="h-3 w-3" /> {connectionBadge.text}
              </span>
              <span className="text-xs text-muted-foreground">{selectedConfig?.status === 'ACTIVE' ? 'Activa' : 'Sin activar'}</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="md"
            className={secondaryActionButtonClass}
            onClick={handleEditClick}
            disabled={isLoadingConfigs || isSaving}
          >
            <Settings className="w-3.5 h-3.5" /> Editar configuración
          </Button>
        </div>

        {mode === 'choose' ? (
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
            <p className="text-xs font-medium text-muted-foreground">Next URL permitida</p>
            <Input
              value={form.nextUrl}
              readOnly={!isFormEditable}
              onChange={(event) => updateField('nextUrl', event.target.value)}
              placeholder="https://campus.utez.edu.mx/portal"
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
          <div className="space-y-1.5 md:col-span-2">
            <p className="text-xs font-medium text-muted-foreground">Auth Token</p>
            <ProtectedField
              mode={isFormEditable ? 'edit' : 'display'}
              value={isFormEditable ? form.authToken : ''}
              onChange={(value) => updateField('authToken', value)}
              placeholder={mode === 'edit-current' ? 'Dejar vacío para conservar el valor actual' : 'Token SSO'}
              readOnly={!isFormEditable}
              label={!isFormEditable && selectedConfig?.hasAuthToken ? 'Token configurado y protegido' : undefined}
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
              label={!isFormEditable && selectedConfig?.hasChannelSecret ? 'Channel Secret configurado y protegido' : undefined}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground">
            Actualizado: {formatDateTime(selectedConfig?.updatedAt)} por {selectedConfig?.updatedByName ?? 'N/D'}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              className={secondaryActionButtonClass}
              onClick={() => void handleValidateConnection()}
              disabled={!canValidate}
              isLoading={isValidating}
            >
              <Cable className="w-3.5 h-3.5" /> Probar conexión
            </Button>
            {isFormEditable ? (
              <Button
                size="md"
                className="gap-2"
                onClick={() => void handleSave()}
                disabled={isSaving || isLoadingConfigs}
                isLoading={isSaving}
              >
                <Save className="w-3.5 h-3.5" /> Guardar configuración
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
