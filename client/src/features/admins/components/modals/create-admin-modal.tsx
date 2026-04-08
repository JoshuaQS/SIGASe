import { ShieldPlus, UserCog } from 'lucide-react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import type { AdminBackendRole, AdminBackendStatus, AdminResponseDto } from '@/features/admins/api/admins-api'

export type AdminFormValues = {
  email: string
  name: string
  lastNamePaternal: string
  lastNameMaternal: string
  password: string
  role: AdminBackendRole
  status: AdminBackendStatus
}

type CreateAdminModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  values: AdminFormValues
  loading?: boolean
  admin?: AdminResponseDto | null
  onClose: () => void
  onChange: <K extends keyof AdminFormValues>(key: K, value: AdminFormValues[K]) => void
  onSubmit: () => void | Promise<void>
}

function fullName(admin?: AdminResponseDto | null) {
  if (!admin) return ''
  return [admin.name, admin.lastNamePaternal, admin.lastNameMaternal].filter(Boolean).join(' ')
}

export function CreateAdminModal({
  open,
  mode,
  values,
  loading = false,
  admin = null,
  onClose,
  onChange,
  onSubmit,
}: CreateAdminModalProps) {
  const isEdit = mode === 'edit'

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        animation="fade"
        className="max-w-3xl border-0 bg-transparent p-0 shadow-none"
      >
        <div className={modalFormShellClass}>
          <ModalFormHeader
            avatar={isEdit ? <UserCog className="h-5 w-5 text-primary" /> : <ShieldPlus className="h-5 w-5 text-primary" />}
            title={isEdit ? 'Editar administrador' : 'Nuevo administrador'}
            subtitle={isEdit ? fullName(admin) : 'Cuenta administrativa conectada al backend real'}
            badges={isEdit && admin ? <Badge variant={admin.status === 'ACTIVE' ? 'success' : 'muted'}>{admin.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}</Badge> : null}
            onClose={onClose}
          />

          <ModalFormBody>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-foreground">Nombre</span>
                <Input value={values.name} onChange={(event) => onChange('name', event.target.value)} />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-foreground">Apellido paterno</span>
                <Input value={values.lastNamePaternal} onChange={(event) => onChange('lastNamePaternal', event.target.value)} />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-foreground">Apellido materno</span>
                <Input value={values.lastNameMaternal} onChange={(event) => onChange('lastNameMaternal', event.target.value)} />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-foreground">Correo</span>
                <Input type="email" value={values.email} onChange={(event) => onChange('email', event.target.value)} />
              </label>

              {!isEdit ? (
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-foreground">Contraseña inicial</span>
                  <Input type="password" value={values.password} onChange={(event) => onChange('password', event.target.value)} />
                </label>
              ) : null}

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-foreground">Rol</span>
                <Select value={values.role} onValueChange={(value) => onChange('role', value as AdminBackendRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN_TI">Admin TI</SelectItem>
                    <SelectItem value="ADMIN_BIBLIOTECA">Admin Biblioteca</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              {!isEdit ? (
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-foreground">Estado inicial</span>
                  <Select value={values.status} onValueChange={(value) => onChange('status', value as AdminBackendStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Activo</SelectItem>
                      <SelectItem value="INACTIVE">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
              ) : null}
            </div>
          </ModalFormBody>

          <ModalFormFooter>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={() => void onSubmit()} isLoading={loading}>
              {isEdit ? 'Guardar cambios' : 'Crear administrador'}
            </Button>
          </ModalFormFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
