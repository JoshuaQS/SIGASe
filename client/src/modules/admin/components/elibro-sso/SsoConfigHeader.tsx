import { BookOpen, PencilLine, RefreshCw, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { button as Button } from '@/components/ui/button';
import type { SsoConfigViewState } from './elibro-sso.types';

interface SsoConfigHeaderProps {
  config: SsoConfigViewState | null;
  isEditMode: boolean;
  isValidating: boolean;
  canEdit?: boolean;
  onEdit: () => void;
  onValidate: () => void;
}

export function SsoConfigHeader({
  config,
  isEditMode,
  isValidating,
  canEdit = true,
  onEdit,
  onValidate,
}: SsoConfigHeaderProps) {
  const isActive = config?.active ?? false;
  const validationStatus = config?.validationStatus ?? 'NOT_VALIDATED';

  const validationBadge = {
    VALID: { variant: 'success' as const, dot: 'bg-success', label: 'Conexión válida' },
    INVALID: { variant: 'destructive' as const, dot: 'bg-destructive', label: 'Credenciales inválidas' },
    NOT_VALIDATED: { variant: 'secondary' as const, dot: 'bg-muted-foreground', label: 'Sin validar' },
  }[validationStatus];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      {/* Identidad */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <BookOpen className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold leading-tight text-foreground">
              Configuración SSO eLibro
            </h1>
            <Badge
              variant={isActive ? 'success' : 'secondary'}
              dotClassName={isActive ? 'bg-success' : 'bg-muted-foreground'}
            >
              {isActive ? 'Activa' : 'Inactiva'}
            </Badge>
            <Badge
              variant={validationBadge.variant}
              dotClassName={validationBadge.dot}
            >
              {validationBadge.label}
            </Badge>
            {isEditMode && (
              <Badge variant="warning" dotClassName="bg-warning">
                Modo edición
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Credenciales y parámetros del flujo SSO con{' '}
            <span className="font-mono text-xs">auth.elibro.net</span>
            {' '}· Solo Administrador TI
          </p>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {!isEditMode && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${isValidating ? 'animate-spin' : ''}`} />}
              onClick={onValidate}
              disabled={!config?.id || isValidating}
              aria-label="Validar conexión SSO"
            >
              {isValidating ? 'Validando…' : 'Validar conexión'}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<PencilLine className="h-3.5 w-3.5" />}
              onClick={onEdit}
              disabled={!canEdit}
              title={!canEdit ? 'Solo el Administrador TI puede editar esta configuración' : undefined}
            >
              Editar
            </Button>
          </>
        )}
        {!config?.id && (
          <span className="inline-flex items-center gap-1.5 text-xs text-warning">
            <ShieldAlert className="h-3.5 w-3.5" />
            Sin configuración activa
          </span>
        )}
      </div>
    </div>
  );
}
