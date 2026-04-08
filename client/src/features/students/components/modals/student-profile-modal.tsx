import { useEffect, useState } from 'react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import {
  ModalFormBody,
  ModalFormFooter,
  ModalFormHeader,
  modalFormShellClass,
} from '@/shared/components/ui/forms/modal-form-primitives'
import { useAppToast } from '@/shared/components/ui/app-toast-provider'
import { useAuthUser } from '@/features/auth/hooks/use-auth-user'
import { changeStudentPassword } from '@/features/auth/api/auth-api'
import { getStudentPortalSummary, type StudentPortalSummaryResponse } from '@/features/student-portal/api/student-portal-api'

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
  const [newPassword, setNewPassword] = useState('')

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
    setNewPassword('')
    onClose()
  }

  const displayName = user?.displayName || summary?.personalInfo.name || 'Estudiante UTEZ'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'EU'

  const canChangePassword = newPassword.trim().length >= 12

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent
        showCloseButton={false}
        animation="fade"
        className="max-w-xl border-0 bg-transparent p-0 shadow-none"
      >
        <div className={modalFormShellClass}>
          <ModalFormHeader
            avatar={<span className="text-sm font-semibold text-primary">{initials}</span>}
            title={displayName}
            badges={(
              <Badge variant={summary?.accountStatus.status === 'ACTIVE' ? 'success' : 'muted'}>
                {summary?.accountStatus.status === 'ACTIVE' ? 'Activo' : (summary?.accountStatus.status ?? 'Sin estado')}
              </Badge>
            )}
            subtitle={summary?.personalInfo.enrollmentId ?? user?.email}
            onClose={onClose}
          />

          <ModalFormBody>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-secondary/20 p-4 text-center">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Estado</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{summary?.personalInfo.status ?? '—'}</p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/20 p-4 text-center">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Accesos 7 días</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{summary?.accessMetrics.accesosUltimos7Dias ?? '—'}</p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/20 p-4 text-center">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Racha</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{summary?.accessMetrics.rachaDiasConAcceso ?? '—'} días</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-secondary/20 p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Correo</p>
                <p className="mt-1 text-sm font-medium text-foreground">{user?.email ?? 'Sin correo'}</p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/20 p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Último acceso</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {loading ? 'Cargando…' : formatDateTime(summary?.accessMetrics.ultimaFechaAcceso)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/20 p-4 sm:col-span-2">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Carrera</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {summary?.personalInfo.career ?? 'Sin carrera configurada'}
                </p>
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-border bg-secondary/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cambiar contraseña</p>
              <Input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Nueva contraseña"
              />
              <p className="text-[11px] text-muted-foreground">
                Usa esta acción para actualizar tu contraseña directamente contra el backend autenticado.
              </p>
            </div>
          </ModalFormBody>

          <ModalFormFooter>
            <Button variant="outline" onClick={handleClose} disabled={changingPassword}>
              Cerrar
            </Button>
            <Button
              disabled={!canChangePassword}
              isLoading={changingPassword}
              onClick={() => {
                if (!canChangePassword) return
                setChangingPassword(true)
                void changeStudentPassword(newPassword.trim())
                  .then(() => {
                    setNewPassword('')
                    showToast({
                      severity: 'success',
                      title: 'Contraseña actualizada',
                      description: 'Tu contraseña se actualizó correctamente.',
                    })
                  })
                  .catch((error) => {
                    const message = error instanceof Error ? error.message : 'No se pudo cambiar la contraseña.'
                    showToast({
                      severity: 'error',
                      title: 'Error actualizando contraseña',
                      description: message,
                    })
                  })
                  .finally(() => setChangingPassword(false))
              }}
            >
              Guardar nueva contraseña
            </Button>
          </ModalFormFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
