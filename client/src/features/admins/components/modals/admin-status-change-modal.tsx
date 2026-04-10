import { useMemo, useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent } from '@/shared/components/ui/dialog'
import {
  ModalFormBody,
  ModalFormFooter,
  ModalFormHeader,
  modalFormShellClass,
} from '@/shared/components/ui/forms/modal-form-primitives'
import type { AdminResponseDto } from '@/features/admins/api/admins-api'

type AdminStatusChangeModalProps = {
  open: boolean
  admin: AdminResponseDto | null
  loading?: boolean
  onClose: () => void
  onConfirm: (payload: { nextStatus: 'ACTIVE' | 'INACTIVE' }) => void | Promise<void>
}

function buildFullName(admin: AdminResponseDto) {
  return [admin.name, admin.lastNamePaternal, admin.lastNameMaternal ?? '']
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function AdminStatusChangeModal({
  open,
  admin,
  loading = false,
  onClose,
  onConfirm,
}: AdminStatusChangeModalProps) {
  const [submitting, setSubmitting] = useState(false)

  const nextStatus = admin?.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
  const isDeactivate = nextStatus === 'INACTIVE'
  const title = isDeactivate ? 'Desactivar administrador' : 'Activar administrador'
  const confirmLabel = isDeactivate ? 'Desactivar' : 'Activar'

  const badges = useMemo(() => {
    if (!admin) return null
    return (
      <Badge variant={admin.status === 'ACTIVE' ? 'success' : 'muted'}>
        {admin.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
      </Badge>
    )
  }, [admin])

  if (!admin) return null

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
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
                {buildFullName(admin)}
                {' · '}
                {admin.email}
              </>
            )}
            badges={badges}
            onClose={onClose}
          />

          <ModalFormBody>
            <div className="relative overflow-hidden rounded-xl border border-border">
              <div className="grid grid-cols-2">
                <div className="border-r border-border bg-success/10">
                  <div className="flex flex-col items-center justify-center px-6 py-6 text-center">
                    <div className="mb-3 h-2 w-2 rounded-full bg-success" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-muted-foreground">
                      Estado actual
                    </p>
                    <p className="mt-2 text-3xl font-extrabold leading-none text-success">
                      {admin.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                    </p>
                  </div>
                </div>
                <div className="bg-destructive/10">
                  <div className="flex flex-col items-center justify-center px-6 py-6 text-center">
                    <div className="mb-3 h-2 w-2 rounded-full bg-destructive" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-muted-foreground">
                      Nuevo estado
                    </p>
                    <p className="mt-2 text-3xl font-extrabold leading-none text-destructive">
                      {nextStatus === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pointer-events-none absolute inset-y-0 left-1/2 flex -translate-x-1/2 items-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive text-destructive-foreground shadow-md ring-2 ring-card">
                  <ArrowLeftRight className="h-4 w-4 rotate-90" />
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-border bg-secondary/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Efecto
              </p>
              <p className="mt-2 text-sm text-foreground">
                {isDeactivate
                  ? 'El administrador perderá acceso inmediato al portal administrativo.'
                  : 'El administrador recuperará acceso inmediato al portal administrativo.'}
              </p>
            </div>
          </ModalFormBody>

          <ModalFormFooter>
            <Button variant="outline" onClick={onClose} disabled={loading || submitting}>
              Cancelar
            </Button>
            <Button
              variant={isDeactivate ? 'destructive' : 'success'}
              isLoading={loading || submitting}
              onClick={() => {
                if (loading || submitting) return
                setSubmitting(true)
                Promise.resolve(onConfirm({ nextStatus }))
                  .finally(() => setSubmitting(false))
              }}
            >
              {confirmLabel}
            </Button>
          </ModalFormFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
