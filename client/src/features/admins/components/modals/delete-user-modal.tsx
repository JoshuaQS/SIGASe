import { useMemo, useState } from 'react'
import { AlertTriangle, Trash2, UserX } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import {
  ModalFormBody,
  ModalFormFooter,
  ModalFormHeader,
  modalFormShellClass,
} from '@/shared/components/ui/forms/modal-form-primitives'
import { cn } from '@/shared/lib/utils'

type DeleteUserModalProps = {
  open: boolean
  targetName: string
  targetMeta?: string
  entityLabel?: string
  loading?: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
}

export function DeleteUserModal({
  open,
  targetName,
  targetMeta,
  entityLabel = 'usuario',
  loading = false,
  onClose,
  onConfirm,
}: DeleteUserModalProps) {
  const [typed, setTyped] = useState('')

  const normalizedTarget = useMemo(() => targetName.trim().toLowerCase(), [targetName])
  const confirmed = typed.trim().toLowerCase() === normalizedTarget
  const handleClose = () => {
    setTyped('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent
        showCloseButton={false}
        animation="fade"
        className="max-w-md border-0 bg-transparent p-0 shadow-none"
      >
        <DialogTitle className="sr-only">{`Eliminar ${entityLabel}`}</DialogTitle>
        <div className={modalFormShellClass}>
          <ModalFormHeader
            avatar={<UserX className="h-5 w-5" />}
            avatarRingClassName="bg-destructive/10 text-destructive ring-destructive/20"
            title={`Eliminar ${entityLabel}`}
            subtitle="Esta acción elimina el registro y no se puede deshacer."
            onClose={onClose}
          />

          <ModalFormBody>
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                  {targetName
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase() ?? '')
                    .join('')}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{targetName}</p>
                  {targetMeta ? <p className="text-xs text-muted-foreground">{targetMeta}</p> : null}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-secondary/20 p-4">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                La operación eliminará el registro y sus referencias operativas visibles.
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Usa esta acción solo cuando el usuario realmente deba salir del padrón administrado.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Confirma escribiendo el nombre completo
              </label>
              <Input
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                placeholder={targetName}
                className={cn(
                  'font-mono text-sm',
                  typed && !confirmed && 'border-destructive focus-visible:ring-destructive/50',
                  confirmed && 'border-success focus-visible:ring-success/50',
                )}
              />
            </div>
          </ModalFormBody>

          <ModalFormFooter>
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmed) {
                  void onConfirm()
                }
              }}
              isLoading={loading}
              disabled={!confirmed}
              leftIcon={Trash2}
            >
              Eliminar definitivamente
            </Button>
          </ModalFormFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
