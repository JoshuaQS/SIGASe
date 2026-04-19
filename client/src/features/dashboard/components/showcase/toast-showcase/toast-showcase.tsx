import { AlertTriangle, CheckCircle2, Info, Siren, Sparkles } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import type { ButtonVariant } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { useAppToast } from '@/shared/components/ui/app-toast-provider'

const BURST_DELAY_MS = 180

type Severity = 'success' | 'error' | 'warning' | 'info'

type ToastPreset = {
  severity: Severity
  label: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const TOAST_PRESETS: ToastPreset[] = [
  {
    severity: 'success',
    label: 'Éxito',
    title: 'Cambios guardados',
    description: 'La configuración SSO fue actualizada correctamente.',
    icon: CheckCircle2,
  },
  {
    severity: 'error',
    label: 'Error',
    title: 'No se pudo sincronizar',
    description: 'El servicio de eLibro no respondió. Intenta nuevamente.',
    icon: Siren,
  },
  {
    severity: 'warning',
    label: 'Advertencia',
    title: 'Credenciales por vencer',
    description: 'Las credenciales configuradas expiran en menos de 3 días.',
    icon: AlertTriangle,
  },
  {
    severity: 'info',
    label: 'Info',
    title: 'Nueva actividad detectada',
    description: 'Se registraron accesos recientes de estudiantes en el portal.',
    icon: Info,
  },
]

const TOAST_BUTTON_VARIANT: Record<Severity, ButtonVariant> = {
  success: 'success',
  error: 'destructive',
  warning: 'warning',
  info: 'info',
}

export function ToastShowcase() {
  const { showToast } = useAppToast()

  const launchBurst = () => {
    TOAST_PRESETS.forEach((preset, index) => {
      setTimeout(() => {
        showToast({
          severity: preset.severity,
          title: `${preset.title} (${index + 1}/4)`,
          description: preset.description,
        })
      }, index * BURST_DELAY_MS)
    })
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Showcase Toasts: Feedback Global</h2>
        <p className="text-sm text-muted-foreground">
          Demostración del sistema de notificaciones con severidades, cola y cierre automático.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Disparadores rápidos</CardTitle>
          <CardDescription>
            Cada botón dispara un toast real del provider global para validar estilo y comportamiento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {TOAST_PRESETS.map((preset) => (
              <Button
                key={preset.severity}
                variant={TOAST_BUTTON_VARIANT[preset.severity]}
                size="sm"
                leftIcon={preset.icon}
                onClick={() =>
                  showToast({
                    severity: preset.severity,
                    title: preset.title,
                    description: preset.description,
                  })
                }
              >
                Toast {preset.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" leftIcon={Sparkles} onClick={launchBurst}>
              Lanzar ráfaga (4 toasts)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                showToast({
                  severity: 'info',
                  title: 'Descripción extendida',
                  description:
                    'Este toast ayuda a verificar truncado visual, pausa por hover y animación de progreso sin romper el layout.',
                })
              }
            >
              Probar mensaje largo
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
