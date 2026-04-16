import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock, User } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent } from '@/shared/components/ui/dialog'
import { useAppToast } from '@/shared/components/ui/app-toast-provider'
import { PasswordField } from '@/shared/components/ui/forms/password-field'
import { cn } from '@/shared/lib/utils'
import { useAuthUser } from '@/features/auth/hooks/use-auth-user'
import { changeStudentPassword } from '@/features/auth/api/auth-api'
import { getStudentPortalSummary, type StudentPortalSummaryResponse } from '@/features/student-portal/api/student-portal-api'
import { confirmPasswordSchema, passwordSchema as passwordPolicySchema } from '@/shared/lib/validation'

type StudentProfileModalProps = {
  open: boolean
  onClose: () => void
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Sin acceso'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Sin acceso'
  return parsed.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}

export function StudentProfileModal({ open, onClose }: StudentProfileModalProps) {
  const user = useAuthUser()
  const { showToast } = useAppToast()
  const [summary, setSummary] = useState<StudentPortalSummaryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile')
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const studentPasswordChangeSchema = z
    .object({
      currentPassword: z.string().min(1, 'La contraseña actual es obligatoria.'),
      newPassword: passwordPolicySchema,
      confirmNewPassword: confirmPasswordSchema,
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
      path: ['confirmNewPassword'],
      message: 'Las contraseñas no coinciden.',
    })

  type PasswordFormValues = z.infer<typeof studentPasswordChangeSchema>

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isValid, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(studentPasswordChangeSchema),
    mode: 'onChange',
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  })

  useEffect(() => {
    if (!open) return

    let active = true

    const loadSummary = async () => {
      setLoading(true)
      try {
        const nextSummary = await getStudentPortalSummary()
        if (!active) return
        setSummary(nextSummary)
      } catch (error) {
        if (!active) return
        const message = error instanceof Error ? error.message : 'No se pudo cargar el perfil del estudiante.'
        showToast({
          severity: 'warning',
          title: 'Perfil incompleto',
          description: message,
        })
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadSummary()

    return () => {
      active = false
    }
  }, [open, showToast])

  const handleClose = () => {
    reset({
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    })
    setPasswordError(null)
    setActiveTab('profile')
    onClose()
  }

  const displayName = user?.displayName || summary?.personalInfo.name || 'Estudiante UTEZ'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'EU'

  const newPasswordValue = watch('newPassword')

  const onPasswordSubmit = handleSubmit(async (values) => {
    if (changingPassword || isSubmitting) return
    setChangingPassword(true)
    setPasswordError(null)
    try {
      await changeStudentPassword(values.newPassword, values.currentPassword)
      reset({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      })
      showToast({
        severity: 'success',
        title: 'Contraseña actualizada',
        description: 'Tu contraseña se actualizó correctamente.',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cambiar la contraseña.'
      setPasswordError(message)
      showToast({
        severity: 'error',
        title: 'Error actualizando contraseña',
        description: message,
      })
    } finally {
      setChangingPassword(false)
    }
  })

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent
        showCloseButton={false}
        animation="fade"
        className="max-w-4xl border border-border bg-card p-0 shadow-lg"
      >
        <div className="flex min-h-[520px]">
          <div className="w-64 border-r border-border bg-muted/30 p-5">
            <div className="flex flex-col items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                <span className="text-sm font-semibold text-primary">{initials}</span>
              </div>
              <p className="mt-3 text-center text-sm font-semibold text-foreground">{displayName}</p>
              <p className="text-center text-[11px] text-muted-foreground">{summary?.personalInfo.enrollmentId ?? user?.email}</p>
              <div className="mt-3">
                <Badge variant={summary?.accountStatus.status === 'ACTIVE' ? 'success' : 'muted'}>
                  {summary?.accountStatus.status === 'ACTIVE' ? 'Activo' : (summary?.accountStatus.status ?? 'Sin estado')}
                </Badge>
              </div>
            </div>

            <div className="mt-6 space-y-1">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors',
                  activeTab === 'profile'
                    ? 'bg-card font-medium text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <User className="h-4 w-4" />
                Perfil
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors',
                  activeTab === 'security'
                    ? 'bg-card font-medium text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Lock className="h-4 w-4" />
                Seguridad
              </button>
            </div>
          </div>

          <div className="flex flex-1 flex-col p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {activeTab === 'profile' ? 'Perfil del estudiante' : 'Seguridad'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {activeTab === 'profile'
                    ? 'Datos del resumen del portal.'
                    : 'Para cambiar tu contraseña, confirma tu contraseña actual y escribe la nueva.'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleClose} disabled={changingPassword}>
                Cerrar
              </Button>
            </div>

            <div className="mt-5 flex-1">
              {activeTab === 'profile' ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-border bg-muted/20 p-4 text-center">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Estado</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">{summary?.personalInfo.status ?? '—'}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-4 text-center">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Accesos 7 días</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">{summary?.accessMetrics.accesosUltimos7Dias ?? '—'}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-4 text-center">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Racha</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">{summary?.accessMetrics.rachaDiasConAcceso ?? '—'} días</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-muted/20 p-4">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Correo</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{user?.email ?? 'Sin correo'}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-4">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Último acceso</p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {loading ? 'Cargando…' : formatDateTime(summary?.accessMetrics.ultimaFechaAcceso)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-4 sm:col-span-2">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Carrera</p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {summary?.personalInfo.career ?? 'Sin carrera configurada'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-muted/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cambiar contraseña</p>
                    {passwordError ? (
                      <div className="mt-3 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        {passwordError}
                      </div>
                    ) : null}
                    <form className="mt-3 grid gap-3" onSubmit={onPasswordSubmit}>
                      <PasswordField
                        label="Contraseña actual"
                        autoComplete="current-password"
                        error={errors.currentPassword?.message}
                        {...register('currentPassword', {
                          onChange: () => setPasswordError(null),
                        })}
                      />
                      <PasswordField
                        label="Nueva contraseña"
                        autoComplete="new-password"
                        error={errors.newPassword?.message}
                        requirementHint="Mínimo 12 caracteres, una mayúscula, una minúscula, un número y un símbolo."
                        {...register('newPassword', {
                          onChange: () => setPasswordError(null),
                        })}
                      />
                      <PasswordField
                        label="Confirmar nueva contraseña"
                        autoComplete="new-password"
                        error={errors.confirmNewPassword?.message}
                        {...register('confirmNewPassword', {
                          onChange: () => setPasswordError(null),
                        })}
                      />
                      {newPasswordValue ? (
                        <p className="text-[11px] text-muted-foreground">
                          La nueva contraseña se está validando en tiempo real.
                        </p>
                      ) : null}
                    </form>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4">
              <Button variant="outline" onClick={handleClose} disabled={changingPassword}>
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={activeTab !== 'security' || !isValid || changingPassword || isSubmitting}
                isLoading={changingPassword || isSubmitting}
                onClick={() => {
                  if (activeTab !== 'security') return
                  void onPasswordSubmit()
                }}
              >
                Guardar nueva contraseña
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
