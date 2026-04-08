import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent } from '@/shared/components/ui/dialog'
import {
  ModalFormBody,
  ModalFormFooter,
  ModalFormHeader,
  modalFormShellClass,
} from '@/shared/components/ui/forms/modal-form-primitives'
import { useAuthUser } from '@/features/auth/hooks/use-auth-user'

type AdminProfileModalProps = {
  open: boolean
  onClose: () => void
}

function formatRoleLabel(role?: string) {
  if (role === 'ROLE_ADMIN_TI') return 'Admin TI'
  if (role === 'ROLE_ADMIN_BIBLIOTECA') return 'Admin Biblioteca'
  return 'Administrador'
}

export function AdminProfileModal({ open, onClose }: AdminProfileModalProps) {
  const user = useAuthUser()
  const displayName = user?.displayName || 'Administrador UTEZ'
  const email = user?.email || 'Sin correo'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'AU'

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        animation="fade"
        className="max-w-lg border-0 bg-transparent p-0 shadow-none"
      >
        <div className={modalFormShellClass}>
          <ModalFormHeader
            avatar={<span className="text-sm font-semibold text-primary">{initials}</span>}
            title={displayName}
            badges={<Badge variant="info">{formatRoleLabel(user?.role)}</Badge>}
            subtitle={email}
            onClose={onClose}
          />

          <ModalFormBody>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-secondary/20 p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Correo</p>
                <p className="mt-1 text-sm font-medium text-foreground">{email}</p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/20 p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Rol</p>
                <p className="mt-1 text-sm font-medium text-foreground">{formatRoleLabel(user?.role)}</p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/20 p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">ID de sesión</p>
                <p className="mt-1 break-all font-mono text-xs text-foreground">{user?.id ?? 'No disponible'}</p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/20 p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Superficie</p>
                <p className="mt-1 text-sm font-medium text-foreground">Portal administrativo</p>
              </div>
            </div>
          </ModalFormBody>

          <ModalFormFooter>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </ModalFormFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
