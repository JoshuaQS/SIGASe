import { Activity, CalendarClock, Clock, Settings2 } from 'lucide-react';
import { FormSection } from '@/components/ui/forms/form-section';
import { Badge } from '@/components/ui/badge';
import type { SsoConfigViewState } from './elibro-sso.types';

interface MetaItemProps {
  icon: React.ElementType;
  label: string;
  value: string;
}

function MetaItem({ icon: Icon, label, value }: MetaItemProps) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] leading-tight text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return 'Sin registro';
  return new Date(iso).toLocaleString('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

interface SsoStatusOverviewCardProps {
  config: SsoConfigViewState | null;
}

export function SsoStatusOverviewCard({ config }: SsoStatusOverviewCardProps) {
  const validationStatus = config?.validationStatus ?? 'NOT_VALIDATED';

  const statusMap = {
    VALID: {
      variant: 'success' as const,
      dot: 'bg-success',
      label: 'Operativo',
      description: config?.validationMessage ?? 'La integración SSO está activa y las credenciales son válidas.',
    },
    INVALID: {
      variant: 'destructive' as const,
      dot: 'bg-destructive',
      label: 'Error de credenciales',
      description: config?.validationMessage ?? 'Las credenciales configuradas no superaron la validación.',
    },
    NOT_VALIDATED: {
      variant: 'secondary' as const,
      dot: 'bg-muted-foreground',
      label: 'Pendiente de validación',
      description: 'La configuración existe pero no ha sido validada contra el servidor SSO.',
    },
  }[validationStatus];

  if (!config?.id) {
    return (
      <FormSection className="py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/10">
            <Settings2 className="h-4 w-4 text-warning" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Sin configuración activa</p>
            <p className="text-xs text-muted-foreground">
              Crea una configuración SSO para habilitar el acceso a eLibro desde el portal de estudiantes.
            </p>
          </div>
        </div>
      </FormSection>
    );
  }

  return (
    <FormSection className="py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Estado principal */}
        <div className="flex items-start gap-3">
          <div className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center">
            <span
              className="absolute inset-0 rounded-full opacity-20"
              style={{
                backgroundColor:
                  validationStatus === 'VALID'
                    ? 'hsl(var(--success))'
                    : validationStatus === 'INVALID'
                    ? 'hsl(var(--destructive))'
                    : 'hsl(var(--muted-foreground))',
                animation: validationStatus === 'VALID' ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
              }}
            />
            <Activity
              className={`h-4 w-4 ${
                validationStatus === 'VALID'
                  ? 'text-success'
                  : validationStatus === 'INVALID'
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              }`}
              aria-hidden
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant={statusMap.variant} dotClassName={statusMap.dot}>
                {statusMap.label}
              </Badge>
              <Badge variant={config.active ? 'success' : 'muted'}>
                {config.active ? 'Integración activa' : 'Integración inactiva'}
              </Badge>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {statusMap.description}
            </p>
          </div>
        </div>

        {/* Metadatos */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border pt-4 sm:grid-cols-none sm:border-0 sm:pt-0 sm:flex sm:gap-6">
          <MetaItem
            icon={Clock}
            label="Última validación"
            value={formatDateTime(config.lastValidatedAt)}
          />
          <MetaItem
            icon={CalendarClock}
            label="Última modificación"
            value={formatDateTime(config.updatedAt)}
          />
        </div>
      </div>
    </FormSection>
  );
}
