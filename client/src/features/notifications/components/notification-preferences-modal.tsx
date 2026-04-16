import { useEffect, useState } from 'react';
import {
  GraduationCap,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from 'lucide-react';

import { useAppToast } from '@/shared/components/ui/app-toast-provider';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Separator } from '@/shared/components/ui/separator';
import { Switch } from '@/shared/components/ui/switch';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferenceResponseDto,
} from '../api';

type NotificationPreferencesModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

type PreferenceKey = keyof NotificationPreferenceResponseDto;

type PreferenceConfig = {
  key: PreferenceKey;
  title: string;
  description: string;
  icon: typeof ShieldCheck;
};

const PREFERENCE_ROWS: PreferenceConfig[] = [
  {
    key: 'notifyCritical',
    title: 'Críticas',
    description: 'Incidentes que requieren atención inmediata.',
    icon: ShieldAlert,
  },
  {
    key: 'notifySecurity',
    title: 'Seguridad',
    description: 'Eventos de acceso, sesión o autenticación.',
    icon: ShieldCheck,
  },
  {
    key: 'notifyAccessFailures',
    title: 'Fallos de acceso',
    description: 'Eventos de acceso a eLibro (exitosos y fallidos).',
    icon: ShieldAlert,
  },
  {
    key: 'notifyStudentChanges',
    title: 'Cambios de estudiantes',
    description: 'Altas, bajas o actualizaciones relevantes.',
    icon: GraduationCap,
  },
  {
    key: 'notifyConfigChanges',
    title: 'Cambios de configuración',
    description: 'Actualizaciones de eLibro y parámetros del sistema.',
    icon: Settings2,
  },
  {
    key: 'notifyAdminChanges',
    title: 'Cambios administrativos',
    description: 'Altas, bajas y ajustes de otros administradores.',
    icon: Users,
  },
];

const DEFAULT_PREFERENCES: NotificationPreferenceResponseDto = {
  notifyCritical: true,
  notifySecurity: true,
  notifyAccessFailures: true,
  notifyStudentChanges: true,
  notifyConfigChanges: true,
  notifyAdminChanges: true,
};

export function NotificationPreferencesModal({
  open,
  onOpenChange,
  onSaved,
}: NotificationPreferencesModalProps) {
  const { showToast } = useAppToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferenceResponseDto>(
    DEFAULT_PREFERENCES,
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const data = await getNotificationPreferences();
        if (!active) return;
        setPreferences(data);
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'No se pudieron cargar las preferencias.';
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [open]);

  const handleToggle = (key: PreferenceKey, checked: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: checked,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const data = await updateNotificationPreferences(preferences);
      setPreferences(data);
      showToast({
        severity: 'success',
        title: 'Preferencias actualizadas',
        description: 'Los cambios de notificaciones se guardaron correctamente.',
      });
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudieron guardar las preferencias.';
      setError(message);
      showToast({
        severity: 'error',
        title: 'No se pudo guardar',
        description: message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="3" className="max-h-[88vh] overflow-hidden">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted/50 text-primary">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div className="space-y-1 text-left">
              <DialogTitle>Preferencias de notificaciones</DialogTitle>
              <DialogDescription>
                Controla qué tipos de alertas aparecen en tu bandeja de administrador.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-col gap-4">
          {error ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
            {loading ? (
              <div className="space-y-3">
                {PREFERENCE_ROWS.map((row) => (
                  <div
                    key={row.key}
                    className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <div className="space-y-1">
                      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-56 animate-pulse rounded bg-muted" />
                    </div>
                    <div className="h-6 w-11 animate-pulse rounded-full bg-muted" />
                  </div>
                ))}
              </div>
            ) : (
              PREFERENCE_ROWS.map((row) => {
                const Icon = row.icon;

                return (
                  <div
                    key={row.key}
                    className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={row.key} className="text-sm font-semibold">
                          {row.title}
                        </Label>
                        <p className="max-w-[36rem] text-sm leading-5 text-muted-foreground">
                          {row.description}
                        </p>
                      </div>
                    </div>

                    <Switch
                      id={row.key}
                      checked={preferences[row.key]}
                      onCheckedChange={(checked) => handleToggle(row.key, checked)}
                      aria-label={row.title}
                      disabled={loading || saving}
                    />
                  </div>
                );
              })
            )}
          </div>

          <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            Los cambios se aplican inmediatamente para nuevas notificaciones.
          </div>
        </div>

        <Separator />

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            Cerrar
          </Button>
          <Button
            onClick={handleSave}
            isLoading={saving}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
