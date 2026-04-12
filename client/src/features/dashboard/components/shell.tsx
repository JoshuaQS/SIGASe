import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardTitle } from '@/shared/components/ui/card'

export default function Shell() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 shrink-0"
              aria-label="Abrir opciones de composición"
            >
              <SlidersHorizontal className="size-4" />
            </Button>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-base sm:text-lg">Compositor de análisis</CardTitle>
              <CardDescription>
                Ajusta cómo segmentar los accesos a eLibro antes de aplicar filtros al panel de monitoreo.
              </CardDescription>
            </div>
          </div>
          <Button type="button" variant="secondary" size="md" className="w-full shrink-0 sm:w-auto">
            Configurar filtro
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
