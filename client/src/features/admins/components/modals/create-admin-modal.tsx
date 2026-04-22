import { useEffect, type FocusEvent } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ShieldPlus, UserCog } from 'lucide-react'

import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import {
  ModalFormBody,
  ModalFormFooter,
  ModalFormHeader,
  modalFormShellClass,
} from '@/shared/components/ui/forms/modal-form-primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import type { AdminBackendRole, AdminResponseDto } from '@/features/admins/api/admins-api'
import {
  capitalizeHumanName,
  emailSchema,
  humanNameSchema,
  optionalHumanNameSchema,
} from '@/shared/lib/validation'
const roleSchema = z.enum(['ADMIN_TI', 'ADMIN_BIBLIOTECA'])
const adminFormSchema = z.object({
  email: emailSchema,
  name: humanNameSchema,
  lastNamePaternal: humanNameSchema,
  lastNameMaternal: optionalHumanNameSchema,
  role: roleSchema,
})

export type AdminFormValues = z.infer<typeof adminFormSchema>

type CreateAdminModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  values: AdminFormValues
  loading?: boolean
  admin?: AdminResponseDto | null
  onClose: () => void
  onSubmit: (values: AdminFormValues) => void | Promise<void>
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
  onSubmit,
}: CreateAdminModalProps) {
  const isEdit = mode === 'edit'

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isValid },
  } = useForm<AdminFormValues>({
    resolver: zodResolver(adminFormSchema),
    mode: 'onChange',
    defaultValues: values,
  })

  const nameField = register('name')
  const lastNamePaternalField = register('lastNamePaternal')
  const lastNameMaternalField = register('lastNameMaternal')
  const emailField = register('email')

  const capitalizeAndSync = (
    fieldName: keyof AdminFormValues,
    onBlur: (event: FocusEvent<HTMLInputElement>) => void,
  ) => (event: FocusEvent<HTMLInputElement>) => {
    onBlur(event)
    const normalized = capitalizeHumanName(event.target.value)
    setValue(fieldName, normalized, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }

  useEffect(() => {
    reset(values)
  }, [reset, values, mode, open])

  const onFormSubmit = handleSubmit(async (formValues) => {
    const payload: AdminFormValues = {
      ...formValues,
      email: formValues.email.trim(),
      name: capitalizeHumanName(formValues.name),
      lastNamePaternal: capitalizeHumanName(formValues.lastNamePaternal),
      lastNameMaternal: capitalizeHumanName(formValues.lastNameMaternal),
    }
    await onSubmit(payload)
  })

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        animation="fade"
        className="max-w-3xl border-0 bg-transparent p-0 shadow-none"
      >
        <DialogTitle className="sr-only">
          {isEdit ? 'Editar administrador' : 'Nuevo administrador'}
        </DialogTitle>
        <form className={modalFormShellClass} onSubmit={onFormSubmit}>
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
                <Input {...nameField} onBlur={capitalizeAndSync('name', nameField.onBlur)} />
                {errors.name ? <span className="text-xs text-destructive">{errors.name.message}</span> : null}
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-foreground">Apellido paterno</span>
                <Input
                  {...lastNamePaternalField}
                  onBlur={capitalizeAndSync('lastNamePaternal', lastNamePaternalField.onBlur)}
                />
                {errors.lastNamePaternal ? <span className="text-xs text-destructive">{errors.lastNamePaternal.message}</span> : null}
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-foreground">Apellido materno</span>
                <Input
                  {...lastNameMaternalField}
                  onBlur={capitalizeAndSync('lastNameMaternal', lastNameMaternalField.onBlur)}
                />
                {errors.lastNameMaternal ? <span className="text-xs text-destructive">{errors.lastNameMaternal.message}</span> : null}
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-foreground">Correo</span>
                <Input type="email" {...emailField} />
                {errors.email ? <span className="text-xs text-destructive">{errors.email.message}</span> : null}
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-foreground">Rol</span>
                <Controller
                  control={control}
                  name="role"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(value) => field.onChange(value as AdminBackendRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN_TI">Admin TI</SelectItem>
                        <SelectItem value="ADMIN_BIBLIOTECA">Admin Biblioteca</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                  {errors.role ? <span className="text-xs text-destructive">{errors.role.message}</span> : null}
                </label>
            </div>
          </ModalFormBody>

          <ModalFormFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={loading} disabled={!isValid || loading}>
              {isEdit ? 'Guardar cambios' : 'Crear administrador'}
            </Button>
          </ModalFormFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
