import { useState } from 'react';
import {
  CheckCircle2,
  Download,
  Eye,
  Layers3,
  Palette,
  Plus,
  Search,
} from 'lucide-react';

import { SectionHeader } from '@/components/ui/section-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { EnergyElibroCtaButton } from '@/components/ui/energy-elibro-cta-button';
import ElibroCtaCard from '@/modules/student/components/cta-card/elibro-cta-card';

const variantButtons = [
  { label: 'Primary', variant: 'primary' as const },
  { label: 'Secondary', variant: 'secondary' as const },
  { label: 'Outline', variant: 'outline' as const },
  { label: 'Ghost', variant: 'ghost' as const },
  { label: 'Destructive', variant: 'destructive' as const },
  { label: 'Success', variant: 'success' as const },
  { label: 'Warning', variant: 'warning' as const },
  { label: 'Info', variant: 'info' as const },
  { label: 'Link', variant: 'link' as const },
];

export default function CustomButtonsShowcase() {
  const [isSimulatingAction, setIsSimulatingAction] = useState(false);

  const handleDemoAction = async () => {
    setIsSimulatingAction(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setIsSimulatingAction(false);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={Palette}
        title="Showcase de Botones"
        subtitle="Catálogo de botones custom y variantes visuales disponibles en SIGASe."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers3 className="h-4 w-4 text-primary" />
            Variantes de Botón Base
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {variantButtons.map((buttonConfig) => (
              <Button key={buttonConfig.label} variant={buttonConfig.variant}>
                {buttonConfig.label}
              </Button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">
            Componente: <code>components/ui/button.tsx</code>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tamaños, Shapes y Estados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Tamaños</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="xs">XS</Button>
              <Button size="sm">SM</Button>
              <Button size="md">MD</Button>
              <Button size="lg">LG</Button>
              <Button size="icon" leftIcon={Plus} aria-label="Agregar" />
              <Button size="icon-sm" leftIcon={Search} aria-label="Buscar" />
              <Button size="icon-xs" leftIcon={Eye} aria-label="Ver" />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Shapes</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button shape="rounded">Rounded</Button>
              <Button shape="pill">Pill</Button>
              <Button shape="pill" variant="info" leftIcon={Download}>
                Exportar
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Loading / Disabled</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button isLoading>Procesando</Button>
              <Button disabled variant="outline">
                Deshabilitado
              </Button>
              <Button
                variant="success"
                rightIcon={CheckCircle2}
                isLoading={isSimulatingAction}
                onClick={() => void handleDemoAction()}
              >
                Simular acción
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">CTA Animado (UI)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <EnergyElibroCtaButton
              onTrigger={async () => {
                await new Promise((resolve) => setTimeout(resolve, 900));
              }}
              busy={false}
              disabled={false}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">CTA Card Completa (Student Module)</CardTitle>
        </CardHeader>
        <CardContent>
          <ElibroCtaCard
            onTrigger={async () => {
              await new Promise((resolve) => setTimeout(resolve, 900));
            }}
            busy={false}
            disabled={false}
            statusMessage="Autenticación segura vía SSO institucional"
            errorMessage={null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
