import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  GraduationCap,
  Hash,
  Mail,
  User,
} from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import {
  ModalFormFooter,
  ModalFormHeader,
  modalFormShellClass,
} from '@/shared/components/ui/forms/modal-form-primitives'
import { useAppToast } from '@/shared/components/ui/app-toast-provider'
import { getAccessLogs, type AccessLogQueryParams } from '@/features/access-logs/api/access-logs-api'
import { getAuditLogs, type AuditLogDto, type AuditLogParams } from '@/features/audit-logs/api/audit-logs-api'
import type { StudentResponseDto } from '@/features/students/api/students-api'
import type { UnifiedAccessLogRecord } from '@/shared/types/api'
import { cn } from '@/shared/lib/utils'

type StudentDetailModalProps = {
  open: boolean
  student: StudentResponseDto | null
  onOpenChange: (open: boolean) => void
}

type StatusHistoryItem = {
  status: 'ACTIVE' | 'INACTIVE'
  occurredAt: string
  by: string
  reason: string
}

function buildFullName(student: StudentResponseDto) {
  return [student.name, student.lastNamePaternal, student.lastNameMaternal ?? '']
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatShortDate(value?: string | null) {
  if (!value) return 'Sin registro'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Sin registro'
  return parsed.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatShortDateTime(value?: string | null) {
  if (!value) return 'Sin registro'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Sin registro'
  return parsed.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function safeJsonParse<T>(value?: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function mapStatusAction(action: string): StatusHistoryItem['status'] | null {
  if (action === 'STUDENT_DEACTIVATE') return 'INACTIVE'
  if (action === 'STUDENT_REACTIVATE') return 'ACTIVE'
  return null
}

function mapStatusLabel(status: StatusHistoryItem['status']) {
  return status === 'ACTIVE' ? 'Activado' : 'Desactivado'
}

function getCurrentStatusLabel(status: StudentResponseDto['status']) {
  if (status === 'PENDING') return 'Pendiente'
  if (status === 'ACTIVE') return 'Activo'
  return 'Inactivo'
}

function getStatusBadgeClass(status: StudentResponseDto['status']) {
  if (status === 'ACTIVE') {
    return 'text-emerald-700 border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
  }
  if (status === 'PENDING') {
    return 'text-amber-700 border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300'
  }
  return 'text-muted-foreground border-border bg-background dark:border-border/80 dark:bg-muted/30 dark:text-muted-foreground'
}

function extractReasonFromAudit(log: AuditLogDto): string | null {
  const metadata = safeJsonParse<Record<string, unknown>>(log.metadataJson)
  const reason = metadata?.reason
  return typeof reason === 'string' && reason.trim() ? reason.trim() : null
}

function extractAccessCardFromLog(access: UnifiedAccessLogRecord) {
  const meta = access.metadata as Record<string, unknown> | null
  const action =
    (typeof meta?.action === 'string' && meta.action.trim()) ||
    (typeof meta?.event === 'string' && meta.event.trim()) ||
    'Acceso'
  const book =
    (typeof meta?.book === 'string' && meta.book.trim()) ||
    (typeof meta?.bookTitle === 'string' && meta.bookTitle.trim()) ||
    (typeof meta?.title === 'string' && meta.title.trim()) ||
    access.reason?.trim() ||
    'Sin detalle'

  const variant = access.result === 'SUCCESS' ? ('success' as const) : ('primary' as const)
  return { action, book, variant }
}

const actionColors = {
  primary: 'bg-primary/8 text-primary',
  success: 'bg-success-soft text-success',
  muted: 'bg-muted text-muted-foreground',
} as const

function buildInitials(student: StudentResponseDto) {
  const a = student.name?.trim()?.[0]?.toUpperCase() ?? ''
  const b = student.lastNamePaternal?.trim()?.[0]?.toUpperCase() ?? ''
  return `${a}${b}` || 'ST'
}

export function StudentDetailModal({ open, student, onOpenChange }: StudentDetailModalProps) {
  const { showToast } = useAppToast()
  const [loadingAccesses, setLoadingAccesses] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [accessHistory, setAccessHistory] = useState<UnifiedAccessLogRecord[]>([])
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([])

  useEffect(() => {
    if (!open || !student) return

    let active = true

    const loadStatusHistory = async () => {
      const params: AuditLogParams = {
        entityType: 'STUDENT',
        search: student.id,
        size: 12,
        page: 0,
        sortBy: 'occurredAt',
        sortDir: 'desc',
      }

      setLoadingHistory(true)
      setStatusHistory([])
      try {
        const response = await getAuditLogs(params)
        if (!active) return

        const items = response.content
          .filter((log) => log.entityId === student.id)
          .map((log) => {
            const status = mapStatusAction(log.action)
            if (!status) return null
            return {
              status,
              occurredAt: log.occurredAt,
              by: log.actorAdminEmail ?? log.actorReference ?? 'Sistema',
              reason: extractReasonFromAudit(log) ?? 'Sin motivo registrado',
            } satisfies StatusHistoryItem
          })
          .filter(Boolean) as StatusHistoryItem[]

        setStatusHistory(items)
      } catch (error) {
        if (!active) return
        const message = error instanceof Error ? error.message : 'No se pudo cargar el historial de estados.'
        showToast({
          severity: 'warning',
          title: 'Historial no disponible',
          description: message,
        })
      } finally {
        if (active) setLoadingHistory(false)
      }
    }

    const loadAccesses = async () => {
      const params: AccessLogQueryParams = {
        actorType: 'STUDENT',
        scope: 'ELIBRO',
        studentId: student.id,
        size: 8,
        page: 0,
        sort: 'occurredAt,desc',
      }

      setLoadingAccesses(true)
      setAccessHistory([])
      try {
        const response = await getAccessLogs(params)
        if (!active) return
        setAccessHistory(response.content)
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

    void loadStatusHistory()
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
      { icon: BookOpen, label: 'Accesos eLibro (total)', value: `${student.totalAccesses}`, mono: false },
    ]
  }, [student])

  if (!student) return null

  const pendingBadge = student.mustChangePassword ? (
    <Badge variant="warning" className="dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
      Cambio de contraseña pendiente
    </Badge>
  ) : null

  const currentStatusReason = statusHistory[0]?.reason ?? 'Sin motivo registrado'
  const currentStatusDate = statusHistory[0]?.occurredAt ?? student.updatedAt
  const accessCards = accessHistory.map(extractAccessCardFromLog)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        animation="fade"
        className="max-w-3xl border-0 bg-transparent p-0 shadow-none"
      >
        <DialogTitle className="sr-only">
          {`Detalle del estudiante: ${buildFullName(student)}`}
        </DialogTitle>
        <div className={modalFormShellClass}>
          <ModalFormHeader
            avatar={<span className="text-sm font-semibold text-primary">{buildInitials(student)}</span>}
            title={buildFullName(student)}
              badges={(
                <>
                  <Badge
                    variant="outlined"
                    className={cn('gap-1', getStatusBadgeClass(student.status))}
                    dotClassName={student.status === 'ACTIVE' ? 'bg-success' : student.status === 'PENDING' ? 'bg-amber-500' : undefined}
                  >
                    {getCurrentStatusLabel(student.status)}
                  </Badge>
                {pendingBadge}
              </>
            )}
            subtitle={(
              <>
                <span className="font-mono text-xs">{student.enrollmentId}</span>
                {' · '}
                {student.career?.name ?? 'Sin carrera'}
                {' · '}
                {student.quarter}° cuatrimestre · Vista de detalle
              </>
            )}
            onClose={() => onOpenChange(false)}
          />

          <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
            <div className="space-y-5 p-6">
              <div>
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Información personal
                </p>
                <div className="space-y-3">
                  {infoItems.map((item) => (
                    <div key={item.label} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                        <item.icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
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

              <div className="border-t border-border pt-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Estado actual
                </p>
                <div
                  className={`rounded-xl border p-4 ${
                    student.status === 'ACTIVE'
                      ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/20'
                      : student.status === 'PENDING'
                        ? 'border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/20'
                        : 'border-border bg-muted/30 dark:border-border/80 dark:bg-muted/30'
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <Badge
                      variant="outlined"
                      className={cn('gap-1', getStatusBadgeClass(student.status))}
                      dotClassName={student.status === 'ACTIVE' ? 'bg-success' : student.status === 'PENDING' ? 'bg-amber-500' : undefined}
                    >
                      {getCurrentStatusLabel(student.status)}
                    </Badge>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" aria-hidden />
                      {formatShortDate(currentStatusDate)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Motivo: {currentStatusReason}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6 p-6">
              <div>
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Historial de estados
                </p>

                {loadingHistory ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                    Cargando historial...
                  </div>
                ) : statusHistory.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                    Sin cambios de estado registrados.
                  </div>
                ) : (
                  <div className="relative pl-4">
                    <div className="absolute bottom-2 left-1.5 top-2 w-px bg-border" />
                    <div className="space-y-4">
                      {statusHistory.map((h, i) => (
                        <div key={`${h.occurredAt}-${i}`} className="flex gap-3">
                          <div
                            className={`relative z-10 -ml-4 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-background ${
                              h.status === 'ACTIVE' ? 'bg-success' : 'bg-muted-foreground'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="mb-0.5 flex flex-wrap items-center gap-2">
                              <span className={`text-xs font-semibold ${h.status === 'ACTIVE' ? 'text-success' : 'text-muted-foreground'}`}>
                                {mapStatusLabel(h.status)}
                              </span>
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <ArrowRight className="h-2.5 w-2.5" aria-hidden />
                                {formatShortDate(h.occurredAt)}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Por: {h.by}
                            </p>
                            <p className="mt-0.5 text-xs leading-relaxed text-foreground">
                              {h.reason}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Historial de accesos
                </p>

                {loadingAccesses ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                    Cargando accesos...
                  </div>
                ) : accessCards.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                    Sin accesos eLibro registrados.
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {accessCards.map((a, i) => (
                      <div
                        key={`${accessHistory[i]?.id ?? i}`}
                        className="flex items-center justify-between border-b border-border py-2.5 last:border-0"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                              actionColors[a.variant] ?? actionColors.muted
                            }`}
                          >
                            {a.action}
                          </span>
                          <p className="truncate text-xs font-medium text-foreground">
                            {a.book}
                          </p>
                        </div>
                        <span className="ml-2 shrink-0 text-[11px] text-muted-foreground">
                          {formatShortDateTime(accessHistory[i]?.occurredAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <ModalFormFooter>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </ModalFormFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
