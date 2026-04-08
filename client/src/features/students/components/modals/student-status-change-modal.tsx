import { useMemo, useState } from 'react'
import { ArrowLeftRight, CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent } from '@/shared/components/ui/dialog'
import { Textarea } from '@/shared/components/ui/textarea'
import {
  ModalFormBody,
  ModalFormFooter,
  ModalFormHeader,
  modalFormShellClass,
} from '@/shared/components/ui/forms/modal-form-primitives'
import type { StudentResponseDto } from '@/features/students/api/students-api'
import { cn } from '@/shared/lib/utils'

type StudentStatusChangeModalProps = {
  open: boolean
  student: StudentResponseDto | null
  loading?: boolean
  onClose: () => void
  onSubmit: (payload: { reason: string; nextStatus: 'ACTIVE' | 'INACTIVE' }) => void | Promise<void>
}

function buildFullName(student: StudentResponseDto) {
  return [student.name, student.lastNamePaternal, student.lastNameMaternal ?? '']
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function StudentStatusChangeModal({
  open,
  student,
  loading = false,
  onClose,
  onSubmit,
}: StudentStatusChangeModalProps) {
  const [reason, setReason] = useState('')

  const nextStatus = student?.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
  const isDeactivate = nextStatus === 'INACTIVE'
  const title = isDeactivate ? 'Deshabilitar estudiante' : 'Reactivar estudiante'
  const confirmLabel = isDeactivate ? 'Deshabilitar' : 'Reactivar'
  const canSubmit = reason.trim().length >= 10
  const handleClose = () => {
    setReason('')
    onClose()
  }

  const impactItems = useMemo(
    () => (isDeactivate
      ? [
        'Perderá acceso al portal estudiantil.',
        'No podrá abrir el flujo de acceso a eLibro.',
        'El cambio quedará auditado con motivo y actor.',
      ]
      : [
        'Recuperará acceso al portal estudiantil.',
        'Podrá volver a abrir el acceso a eLibro.',
        'El cambio quedará auditado con motivo y actor.',
      ]),
    [isDeactivate],
  )

  if (!student) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent
        showCloseButton={false}
        animation="fade"
        className="max-w-2xl border-0 bg-transparent p-0 shadow-none"
      >
        <div className={modalFormShellClass}>
          <ModalFormHeader
            avatar={<ArrowLeftRight className="h-5 w-5 text-primary" />}
            title={title}
            subtitle={(
              <>
                {buildFullName(student)}
                {' · '}
                <span className="font-mono text-xs">{student.enrollmentId}</span>
                {' · '}
                {student.career?.code ?? 'Sin carrera'}
              </>
            )}
            badges={(
              <Badge variant={student.status === 'ACTIVE' ? 'success' : 'muted'}>
                {student.status === 'ACTIVE' ? 'Activo' : 'Deshabilitado'}
              </Badge>
            )}
            onClose={onClose}
          />

          <ModalFormBody>
            <div
              className={cn(
                'rounded-xl border px-4 py-4 text-sm',
                isDeactivate
                  ? 'border-destructive/20 bg-destructive/10 text-destructive'
                  : 'border-success/20 bg-success/10 text-success',
              )}
            >
              <div className="mb-2 flex items-center gap-2 font-semibold">
                {isDeactivate ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                {isDeactivate ? 'Impacto inmediato' : 'Restauración de acceso'}
              </div>
              <div className="space-y-1.5 text-xs leading-relaxed">
                {impactItems.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Motivo <span className="text-destructive">*</span>
              </label>
              <Textarea
                rows={4}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={isDeactivate
                  ? 'Describe por qué se deshabilita este estudiante.'
                  : 'Describe por qué se reactiva este estudiante.'}
              />
              <p className="text-[11px] text-muted-foreground">
                Se usa para la operación real de backend y para trazabilidad en auditoría.
              </p>
            </div>
          </ModalFormBody>

          <ModalFormFooter>
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              variant={isDeactivate ? 'destructive' : 'success'}
              onClick={() => {
                if (canSubmit) {
                  void onSubmit({ reason: reason.trim(), nextStatus })
                }
              }}
              isLoading={loading}
              disabled={!canSubmit}
            >
              {confirmLabel}
            </Button>
          </ModalFormFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
