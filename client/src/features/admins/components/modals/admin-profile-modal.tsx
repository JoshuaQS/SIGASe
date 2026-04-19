import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  GraduationCap,
  Loader2,
  LogOut,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { changeAdminPassword } from '@/features/auth/api/auth-api'
import { useAuthUser } from '@/features/auth/hooks/use-auth-user'
import { authSession } from '@/features/auth/store/auth-session-store'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferenceResponseDto,
} from '@/features/notifications/api/notifications-api'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent } from '@/shared/components/ui/dialog'
import { PasswordField } from '@/shared/components/ui/forms/password-field'
import { Switch } from '@/shared/components/ui/switch'
import { useAppToast } from '@/shared/components/ui/app-toast-provider'
import { AppConfirmDialog } from '@/shared/components/ui/confirmation-dialog'
import { confirmPasswordSchema, passwordSchema } from '@/shared/lib/validation'
import { cn } from '@/shared/lib/utils'

type AdminProfileModalProps = {
  open: boolean
  onClose: () => void
  initialTab?: Tab
}

type Tab = 'profile' | 'alerts'

type PreferenceKey = keyof NotificationPreferenceResponseDto

type PreferenceConfig = {
  key: PreferenceKey
  title: string
  description: string
  icon: typeof ShieldCheck
}

const PREFERENCE_ROWS: PreferenceConfig[] = [
  {
    key: 'notifyCritical',
    title: 'Críticas',
    description: 'Incidentes urgentes.',
    icon: ShieldAlert,
  },
  {
    key: 'notifySecurity',
    title: 'Seguridad',
    description: 'Sesión y autenticación.',
    icon: ShieldCheck,
  },
  {
    key: 'notifyAccessFailures',
    title: 'Fallos de acceso',
    description: 'Errores en portal/eLibro.',
    icon: ShieldAlert,
  },
  {
    key: 'notifyStudentChanges',
    title: 'Cambios de estudiantes',
    description: 'Altas, bajas y edición.',
    icon: GraduationCap,
  },
  {
    key: 'notifyConfigChanges',
    title: 'Configuración',
    description: 'Ajustes del sistema.',
    icon: Settings2,
  },
  {
    key: 'notifyAdminChanges',
    title: 'Cambios administrativos',
    description: 'Movimientos de admins.',
    icon: Users,
  },
]

const DEFAULT_PREFERENCES: NotificationPreferenceResponseDto = {
  notifyCritical: true,
  notifySecurity: true,
  notifyAccessFailures: true,
  notifyStudentChanges: true,
  notifyConfigChanges: true,
  notifyAdminChanges: true,
}

const adminPasswordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'La contraseña actual es obligatoria.'),
    newPassword: passwordSchema,
    confirmNewPassword: confirmPasswordSchema,
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    path: ['confirmNewPassword'],
    message: 'Las contraseñas no coinciden.',
  })

type AdminPasswordChangeValues = z.infer<typeof adminPasswordChangeSchema>

function formatRoleLabel(role?: string) {
  if (role === 'ROLE_ADMIN_TI') return 'Admin TI'
  if (role === 'ROLE_ADMIN_BIBLIOTECA') return 'Admin Biblioteca'
  return 'Administrador'
}

export function AdminProfileModal({ open, onClose, initialTab = 'profile' }: AdminProfileModalProps) {
  const user = useAuthUser()
  const navigate = useNavigate()
  const { showToast } = useAppToast()

  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [prefs, setPrefs] = useState<NotificationPreferenceResponseDto>(DEFAULT_PREFERENCES)
  const [prefsLoading, setPrefsLoading] = useState(false)
  const [prefsSaving, setPrefsSaving] = useState(false)
  const [prefsError, setPrefsError] = useState<string | null>(null)

  const {
    register: registerPasswordField,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    watch: watchPasswordForm,
    formState: { errors: passwordErrors, isSubmitting: passwordSaving, isValid: canChangePassword },
  } = useForm<AdminPasswordChangeValues>({
    resolver: zodResolver(adminPasswordChangeSchema),
    mode: 'onChange',
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  })

  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)

  const displayName = user?.displayName || 'Administrador'
  const email = user?.email || 'sin-correo'
  const hasTemporaryPasswordPending =
    Boolean(user?.role?.startsWith('ROLE_ADMIN')) && user?.hasChangedTemporaryPassword === false
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'A'

  const navItems = useMemo(() => [
    { key: 'profile' as const, icon: User, label: 'Perfil' },
    { key: 'alerts' as const, icon: Bell, label: 'Alerts' },
  ], [])

  useEffect(() => {
    if (!open) return
    setActiveTab(initialTab)
    setPrefsError(null)
    setPasswordError(null)
    resetPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    })
  }, [open, initialTab, resetPasswordForm])

  useEffect(() => {
    if (!open || activeTab !== 'alerts') return
    let active = true
    setPrefsLoading(true)
    setPrefsError(null)
    void (async () => {
      try {
        const data = await getNotificationPreferences()
        if (!active) return
        setPrefs(data)
      } catch (error) {
        if (!active) return
        const message = error instanceof Error ? error.message : 'No se pudieron cargar las preferencias.'
        setPrefsError(message)
      } finally {
        if (active) setPrefsLoading(false)
      }
    })()
    return () => { active = false }
  }, [activeTab, open])

  const handleTogglePref = (key: PreferenceKey, checked: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: checked }))
  }

  const handleSavePrefs = async () => {
    setPrefsSaving(true)
    setPrefsError(null)
    try {
      const updated = await updateNotificationPreferences(prefs)
      setPrefs(updated)
      showToast({
        severity: 'success',
        title: 'Preferencias actualizadas',
        description: 'La configuración de notificaciones se guardó correctamente.',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar la configuración.'
      setPrefsError(message)
      showToast({
        severity: 'error',
        title: 'Error al guardar',
        description: message,
      })
    } finally {
      setPrefsSaving(false)
    }
  }

  const onPasswordFormSubmit = handlePasswordSubmit(async (values) => {
    setPasswordError(null)
    try {
      await changeAdminPassword(values.currentPassword, values.newPassword)
      resetPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      })
      showToast({
        severity: 'success',
        title: 'Contraseña actualizada',
        description: 'Por seguridad, tu sesión actual puede requerir volver a iniciar sesión.',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cambiar la contraseña.'
      setPasswordError(message)
      showToast({
        severity: 'error',
        title: 'Error al cambiar contraseña',
        description: message,
      })
    }
  })

  const newPasswordValue = watchPasswordForm('newPassword')

  const handleLogout = async () => {
    if (logoutLoading) return
    setLogoutLoading(true)
    try {
      await authSession.logout()
      setLogoutConfirmOpen(false)
      showToast({
        severity: 'success',
        title: 'Sesión cerrada',
        description: 'Tu sesión administrativa ha finalizado.',
      })
      onClose()
      navigate('/login?mode=admin', { replace: true, state: { mode: 'admin' } })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cerrar la sesión.'
      showToast({
        severity: 'error',
        title: 'Error al cerrar sesión',
        description: message,
      })
    } finally {
      setLogoutLoading(false)
    }
  }

  return (
    <>
      <AppConfirmDialog
        open={logoutConfirmOpen}
        title="Cerrar sesión"
        description="Se cerrará tu sesión administrativa actual. ¿Deseas continuar?"
        confirmText="Cerrar sesión"
        cancelText="Cancelar"
        confirmColor="warning"
        isConfirming={logoutLoading}
        onCancel={() => !logoutLoading && setLogoutConfirmOpen(false)}
        onConfirm={() => { if (!logoutLoading) void handleLogout() }}
      />

      <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
        <DialogContent
          showCloseButton={false}
          animation="fade"
          className="max-w-3xl border border-border bg-card p-0 shadow-lg"
        >
        <div className="flex min-h-[420px] rounded-lg">
          <div className="w-52 border-r border-border bg-muted/30 p-5">
            <div className="flex flex-col items-center">
              <Avatar className="h-16 w-16">
                <AvatarImage alt={displayName} />
                <AvatarFallback className="bg-primary text-base font-semibold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <p className="mt-3 text-center text-sm font-semibold text-foreground">{displayName}</p>
              <p className="text-center text-[11px] text-muted-foreground">{email}</p>
              <span className="mt-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {formatRoleLabel(user?.role)}
              </span>
            </div>

            <div className="mt-5 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors',
                    activeTab === item.key
                      ? 'bg-card font-medium text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="mt-6 flex items-center gap-1.5 text-xs text-destructive hover:underline disabled:pointer-events-none disabled:opacity-60"
              onClick={() => setLogoutConfirmOpen(true)}
              disabled={logoutLoading}
            >
              <LogOut className="h-3 w-3" /> {logoutLoading ? 'Cerrando sesión...' : 'Cerrar sesión'}
            </button>
          </div>

          <div className="relative flex-1 p-6">
            <button
              type="button"
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={onClose}
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>

            {activeTab === 'profile' ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Perfil de administrador</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Información de la sesión y seguridad de acceso.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-border bg-muted/25 p-3 sm:col-span-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Nombre</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{displayName}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/25 p-3 sm:col-span-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Correo</p>
                    <p className="mt-1 break-all text-sm font-medium text-foreground">{email}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/25 p-3 sm:col-span-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Rol</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{formatRoleLabel(user?.role)}</p>
                  </div>
                </div>

                {hasTemporaryPasswordPending ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950">
                    <p className="font-semibold">Contraseña temporal pendiente</p>
                    <p className="mt-1 text-xs leading-5 text-amber-950/80">
                      Tu cuenta sigue usando una contraseña temporal. El acceso no está bloqueado,
                      pero debes cambiarla para cerrar ese pendiente de seguridad.
                    </p>
                  </div>
                ) : null}

                <div className="rounded-lg border border-border bg-muted/15 p-4">
                  <div className="mb-3">
                    <h4 className="text-sm font-semibold text-foreground">Cambiar contraseña</h4>
                    <p className="mt-1 text-xs text-muted-foreground">Mínimo 12 caracteres.</p>
                  </div>

                  {passwordError ? (
                    <div className="mb-3 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      {passwordError}
                    </div>
                  ) : null}

                  <form className="grid gap-3 sm:grid-cols-2" onSubmit={onPasswordFormSubmit}>
                    <div className="space-y-1.5 sm:col-span-2">
                      <PasswordField
                        label="Contraseña actual"
                        autoComplete="current-password"
                        error={passwordErrors.currentPassword?.message}
                        {...registerPasswordField('currentPassword', {
                          onChange: () => setPasswordError(null),
                        })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <PasswordField
                        label="Nueva contraseña"
                        autoComplete="new-password"
                        error={passwordErrors.newPassword?.message}
                        requirementHint="Mínimo 12 caracteres, una mayúscula, una minúscula, un número y un símbolo."
                        {...registerPasswordField('newPassword', {
                          onChange: () => setPasswordError(null),
                        })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <PasswordField
                        label="Confirmar contraseña"
                        autoComplete="new-password"
                        error={passwordErrors.confirmNewPassword?.message}
                        {...registerPasswordField('confirmNewPassword', {
                          onChange: () => setPasswordError(null),
                        })}
                      />
                    </div>

                    <div className="mt-3 flex justify-end sm:col-span-2">
                      <Button size="sm" type="button" isLoading={passwordSaving} disabled={!canChangePassword}>
                        Guardar contraseña
                      </Button>
                    </div>
                  </form>
                  {newPasswordValue ? (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      La nueva contraseña se está validando en tiempo real.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[340px] flex-col">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-foreground">Alerts</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Configura qué notificaciones quieres recibir.
                  </p>
                </div>

                {prefsError ? (
                  <div className="mb-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {prefsError}
                  </div>
                ) : null}

                <div className="flex-1 overflow-y-auto pr-1">
                  {prefsLoading ? (
                    <div className="grid place-items-center rounded-lg border border-border bg-card px-3 py-8 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cargando preferencias...
                      </span>
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {PREFERENCE_ROWS.map((row) => {
                        const Icon = row.icon
                        return (
                          <div
                            key={row.key}
                            className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-2"
                          >
                            <div className="min-w-0">
                              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                                {row.title}
                              </p>
                              <p className="truncate text-[11px] text-muted-foreground">{row.description}</p>
                            </div>
                            <Switch
                              id={`pref-${row.key}`}
                              checked={prefs[row.key]}
                              onCheckedChange={(checked) => handleTogglePref(row.key, checked)}
                              disabled={prefsLoading || prefsSaving}
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={onClose} disabled={prefsSaving}>
                    Cerrar
                  </Button>
                  <Button size="sm" isLoading={prefsSaving} disabled={prefsLoading} onClick={() => void handleSavePrefs()}>
                    Guardar cambios
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
