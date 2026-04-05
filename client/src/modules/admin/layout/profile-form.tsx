import * as React from "react"
import { Button } from "@/components/ui/Button"

export function ProfileForm() {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-lg ring-1 ring-border/50">
      <div className="space-y-1">
        <h2 className="text-xl font-extrabold tracking-tight text-foreground">Información del Perfil</h2>
        <p className="text-sm font-medium text-muted-foreground">Gestiona tus datos personales y configuración de cuenta.</p>
      </div>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nombre Completo</label>
          <div className="px-4 py-3 bg-secondary/50 rounded-xl text-sm font-semibold border border-border/50">Administrador UTEZ</div>
        </div>
        <div className="grid gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Correo Electrónico</label>
          <div className="px-4 py-3 bg-secondary/50 rounded-xl text-sm font-semibold border border-border/50">admin@utez.edu.mx</div>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" className="rounded-xl font-bold">Cerrar</Button>
        <Button className="rounded-xl font-bold px-6">Guardar Cambios</Button>
      </div>
    </div>
  )
}
