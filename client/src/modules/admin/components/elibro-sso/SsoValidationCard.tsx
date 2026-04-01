import { AlertTriangle, CheckCircle2, Clock, RefreshCw, XCircle } from 'lucide-react';
import { FormSection, FormSectionHeader } from '@/components/ui/forms/form-section';
import { button as Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SsoConfigViewState } from './elibro-sso.types';

interface SsoValidationCardProps {
  config: SsoConfigViewState | null;
  isValidating: boolean;
  onValidate: () => void;
}

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return 'Nunca validado';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 1) return 'Hace un momento';
  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours < 24) return `Hace ${hours} h`;
  return `Hace ${days} día${days !== 1 ? 's' : ''}`;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function SsoValidationCard({
  config,
  isValidating,
  onValidate,
}: SsoValidationCardProps) {
  const status = config?.validationStatus ?? 'NOT_VALIDATED';

  const statusConfig = {
    VALID: {
      icon: CheckCircle2,
      iconClass: 'text-success',
      bgClass: 'bg-success/10',
      badgeVariant: 'success' as const,
      badgeDot: 'bg-success',
      label: 'Conexión verificada',
    },
    INVALID: {
      icon: XCircle,
      iconClass: 'text-destructive',
      bgClass: 'bg-destructive/10',
      badgeVariant: 'destructive' as const,
      badgeDot: 'bg-destructive',
      label: 'Credenciales inválidas',
    },
    NOT_VALIDATED: {
      icon: AlertTriangle,
      iconClass: 'text-warning',
      bgClass: 'bg-warning/10',
      badgeVariant: 'warning' as const,
      badgeDot: 'bg-warning',
      label: 'Sin validar',
    },
  }[status];

  const { icon: StatusIcon } = statusConfig;

  return (
    <FormSection className="p-5">
      <FormSectionHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${statusConfig.bgClass}`}>
              <StatusIcon className={`h-3.5 w-3.5 ${statusConfig.iconClass}`} aria-hidden />
            </div>
            <p className="text-sm font-semibold text-foreground">Validación SSO</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onValidate}
            disabled={!config?.id || isValidating}
            aria-label="Revalidar conexión SSO"
            title="Revalidar"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isValidating ? 'animate-spin' : ''}`}
              aria-hidden
            />
          </Button>
        </div>
      </FormSectionHeader>

      <div className="space-y-3 pt-1">
        {/* Badge de estado */}
        <Badge variant={statusConfig.badgeVariant} dotClassName={statusConfig.badgeDot}>
          {statusConfig.label}
        </Badge>

        {/* Mensaje de validación */}
        <p className="text-xs leading-relaxed text-muted-foreground">
          {config?.validationMessage
            ? config.validationMessage
            : status === 'NOT_VALIDATED'
            ? 'Ejecuta "Validar conexión" para comprobar que las credenciales configuradas son correctas y el servidor SSO responde correctamente.'
            : 'Sin mensaje de validación disponible.'}
        </p>

        {/* Timestamp */}
        {config?.lastValidatedAt && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" aria-hidden />
            <span>
              {formatRelativeTime(config.lastValidatedAt)} ·{' '}
              {formatDateTime(config.lastValidatedAt)}
            </span>
          </div>
        )}

        {/* CTA si no hay config */}
        {!config?.id && (
          <p className="text-[11px] text-muted-foreground">
            Guarda una configuración primero para poder validarla.
          </p>
        )}
      </div>
    </FormSection>
  );
}
