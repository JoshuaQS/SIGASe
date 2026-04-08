import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Calendar,
  Clock,
  GraduationCap,
  Hash,
  LaptopMinimal,
  Mail,
  ShieldCheck,
  User,
} from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Dialog, DialogContent } from '@/shared/components/ui/dialog'
import { ModalFormBody, ModalFormHeader, modalFormShellClass } from '@/shared/components/ui/forms/modal-form-primitives'
import { useAppToast } from '@/shared/components/ui/app-toast-provider'
import { getAccessLogs, type AccessLogQueryParams } from '@/features/access-logs/api/access-logs-api'
import type { StudentResponseDto } from '@/features/students/api/students-api'
import type { UnifiedAccessLogRecord } from '@/shared/types/api'

type StudentDetailModalProps = {
  open: boolean
  student: StudentResponseDto | null
  onOpenChange: (open: boolean) => void
}

function buildFullName(student: StudentResponseDto) {
  return [student.name, student.lastNamePaternal, student.lastNameMaternal ?? '']
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Sin registro'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Sin registro'
  return parsed.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}

function formatScope(scope: UnifiedAccessLogRecord['scope']) {
  switch (scope) {
    case 'SIGASE_LOCAL':
      return 'SIGASe local'
    case 'SIGASE_GOOGLE':
      return 'SIGASe Google'
    case 'ELIBRO':
      return 'eLibro'
    default:
      return 'Acceso'
  }
}

function formatResult(result: string) {
  return result === 'SUCCESS' ? 'Exitoso' : result.replaceAll('_', ' ')
}

export function StudentDetailModal({ open, student, onOpenChange }: StudentDetailModalProps) {
  const { showToast } = useAppToast()
  const [loadingAccesses, setLoadingAccesses] = useState(false)
  const [recentAccesses, setRecentAccesses] = useState<UnifiedAccessLogRecord[]>([])

  useEffect(() => {
    if (!open || !student) return

    let active = true

    const loadAccesses = async () => {
      const params: AccessLogQueryParams = {
        actorType: 'STUDENT',
        studentId: student.id,
        size: 6,
        page: 0,
        sort: 'occurredAt,desc',
      }

      setLoadingAccesses(true)
      setRecentAccesses([])
      try {
        const response = await getAccessLogs(params)
        if (!active) return
        setRecentAccesses(response.content)
      } catch (error) {
        if (!active) return
        const message = error instanceof Error ? error.message : 'No se pudo cargar el historial de accesos.'
        showToast({
          severity: 'warning',
          title: 'Accesos no disponibles',
          description: message,
        })
      } finally {
        if (active) {
          setLoadingAccesses(false)
        }
      }
    }

    void loadAccesses()

    return () => {
      active = false
    }
  }, [open, showToast, student])

  const infoItems = useMemo(() => {
    if (!student) return []
    return [
      { icon: User, label: 'Nombre completo', value: buildFullName(student), mono: false },
      { icon: Hash, label: 'Matrícula', value: student.enrollmentId, mono: true },
      { icon: GraduationCap, label: 'Carrera', value: student.career?.name ?? 'Sin carrera', mono: false },
      { icon: Calendar, label: 'Cuatrimestre', value: `${student.quarter}° cuatrimestre`, mono: false },
      { icon: Mail, label: 'Correo institucional', value: student.institutionalEmail, mono: true },
      {
        icon: ShieldCheck,
        label: 'Estado de acceso',
        value: student.status === 'ACTIVE' ? 'Activo' : 'Deshabilitado',
        mono: false,
      },
    ]
  }, [student])

  if (!student) return null

  const statusVariant = student.status === 'ACTIVE' ? 'success' : 'muted'
  const pendingBadge = student.mustChangePassword ? (
    <Badge variant="warning">Cambio de contraseña pendiente</Badge>
  ) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        animation="fade"
        className="max-w-5xl border-0 bg-transparent p-0 shadow-none"
      >
        <div className={modalFormShellClass}>
          <ModalFormHeader
            avatar={<span className="text-lg font-bold text-primary">{student.name.slice(0, 1)}{student.lastNamePaternal.slice(0, 1)}</span>}
            title={buildFullName(student)}
            badges={(
              <>
                <Badge variant={statusVariant}>{student.status === 'ACTIVE' ? 'Activo' : 'Deshabilitado'}</Badge>
                {pendingBadge}
              </>
            )}
            subtitle={(
              <>
                <span className="font-mono">{student.enrollmentId}</span>
                {' · '}
                {student.career?.name ?? 'Sin carrera'}
                {' · '}
                Último acceso: {formatDateTime(student.lastLoginAt)}
              </>
            )}
            onClose={() => onOpenChange(false)}
          />

          <div className="grid grid-cols-1 divide-y divide-border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            <ModalFormBody className="space-y-5">
              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Información del estudiante
                </p>
                <div className="space-y-3.5">
                  {infoItems.map((item) => (
                    <div key={item.label} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground">{item.label}</p>
                        <p className={`text-sm font-medium text-foreground ${item.mono ? 'font-mono text-xs' : ''}`}>
                          {item.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-secondary/20 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Señales de acceso
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Creado</p>
                    <p className="text-sm font-medium text-foreground">{formatDateTime(student.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Actualizado</p>
                    <p className="text-sm font-medium text-foreground">{formatDateTime(student.updatedAt)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Último acceso</p>
                    <p className="text-sm font-medium text-foreground">{formatDateTime(student.lastLoginAt)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Primer acceso pendiente</p>
                    <p className="text-sm font-medium text-foreground">{student.mustChangePassword ? 'Sí' : 'No'}</p>
                  </div>
                </div>
              </div>
            </ModalFormBody>

            <ModalFormBody className="space-y-4">
              <div className="flex items-center gap-2">
                <LaptopMinimal className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Accesos recientes
                </p>
              </div>

              {loadingAccesses ? (
                <div className="rounded-xl border border-dashed border-border bg-secondary/20 px-4 py-6 text-sm text-muted-foreground">
                  Cargando accesos recientes...
                </div>
              ) : recentAccesses.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-secondary/20 px-4 py-6 text-sm text-muted-foreground">
                  No hay accesos recientes para este estudiante.
                </div>
              ) : (
                <div className="space-y-2">
                  {recentAccesses.map((access) => (
                    <div
                      key={access.id}
                      className="rounded-xl border border-border px-4 py-3 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={access.result === 'SUCCESS' ? 'success' : 'destructive'}>
                          {formatResult(access.result)}
                        </Badge>
                        <Badge variant="outlined">{formatScope(access.scope)}</Badge>
                        <span className="text-[11px] text-muted-foreground">{formatDateTime(access.occurredAt)}</span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {access.reason || 'Sin razón adicional registrada'}
                      </p>
                      <div className="mt-2 grid gap-2 text-[11px] text-muted-foreground sm:grid-cols-2">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          requestId: {access.requestId ?? 'N/D'}
                        </span>
                        <span className="truncate">
                          IP: {access.ipAddressMasked ?? 'N/D'}
                        </span>
                        <span className="truncate">
                          Session: {access.sessionId ?? 'N/D'}
                        </span>
                        <span className="truncate">
                          Canal: {access.channelName ?? 'N/D'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-xl border border-border bg-secondary/20 p-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Contexto técnico visible
                  </p>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  El detalle muestra solo metadata saneada de access logs: requestId, sessionId, IP enmascarada y señales del canal,
                  sin exponer IP raw, user-agent raw ni credenciales.
                </p>
              </div>
            </ModalFormBody>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
