import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Clock3, ShieldCheck, User, Zap } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { useAppToast } from '@/shared/components/ui/app-toast-provider';
import ElibroCtaCard from '@/features/student-portal/components/cta-card/elibro-cta-card';
import { useAuthUser } from '@/features/auth/hooks/use-auth-user';
import { ApiClientError } from '@/shared/lib/http/api-client';
import {
  getStudentPortalSummary,
  requestStudentElibroAccess,
  type StudentPortalSummaryResponse,
} from '@/features/student-portal/api/student-portal-api';
import { cn } from '@/shared/lib/utils';
import portalEffects from './portal-effects.module.css';

type ActivityTone = 'bg-success' | 'bg-warning' | 'bg-info';

type ActivityItem = {
  id: string;
  title: string;
  meta: string;
  tone: ActivityTone;
  badge?: string;
};

function resolveErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message || 'No se pudo completar la operación.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'No se pudo completar la operación.';
}

function formatDateTime(isoDate: string | null) {
  if (!isoDate) return 'Sin registro reciente';

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Fecha inválida';

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function resolveDisabledReason(summary: StudentPortalSummaryResponse | null) {
  if (!summary) return 'No hay resumen de portal disponible.';
  if (summary.cta.enabled) return null;

  switch (summary.cta.reason) {
    case 'STUDENT_INACTIVE':
      return summary.accountStatus.message || 'Tu cuenta está inactiva.';
    default:
      return 'El acceso a eLibro no está disponible por ahora.';
  }
}

const CAREER_STOPWORDS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'en', 'para']);

function splitStudentName(name: string) {
  const cleaned = name.trim().replace(/\s+/g, ' ');
  if (!cleaned) {
    return { firstNames: 'Sin nombre', lastNames: 'Sin apellidos' };
  }

  const parts = cleaned.split(' ');
  if (parts.length === 1) {
    return { firstNames: parts[0], lastNames: 'Sin apellidos' };
  }

  if (parts.length === 2) {
    return { firstNames: parts[0], lastNames: parts[1] };
  }

  return {
    firstNames: parts.slice(0, -2).join(' '),
    lastNames: parts.slice(-2).join(' '),
  };
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function resolveStudentNameParts(summaryName: string, profileDisplayName?: string) {
  const fallback = splitStudentName(summaryName);
  const full = (profileDisplayName || '').trim().replace(/\s+/g, ' ');
  if (!full) return fallback;

  const summary = summaryName.trim().replace(/\s+/g, ' ');
  const summaryTokens = summary ? summary.split(' ') : [];
  const fullTokens = full.split(' ');

  if (summaryTokens.length && fullTokens.length > summaryTokens.length) {
    const matchesPrefix = summaryTokens.every((token, index) => {
      return normalizeText(fullTokens[index] || '') === normalizeText(token);
    });

    if (matchesPrefix) {
      const surnames = fullTokens.slice(summaryTokens.length).join(' ').trim();
      if (surnames) {
        return {
          firstNames: summary || fallback.firstNames,
          lastNames: surnames,
        };
      }
    }
  }

  if (fullTokens.length >= 3) {
    return {
      firstNames: fullTokens.slice(0, -2).join(' '),
      lastNames: fullTokens.slice(-2).join(' '),
    };
  }

  return fallback;
}

function buildCareerAcronym(career: string | null) {
  if (!career || career === 'Sin carrera asignada') return 'N/D';

  const acronymMatch = career.match(/\(([A-Za-zÁÉÍÓÚÑáéíóúñ0-9]{2,8})\)/);
  if (acronymMatch?.[1]) {
    return acronymMatch[1].toUpperCase();
  }

  const tokens = career
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .filter((token) => !CAREER_STOPWORDS.has(token.toLowerCase()));

  if (!tokens.length) return 'N/D';
  if (tokens.length === 1) return tokens[0].slice(0, 4).toUpperCase();

  return tokens.map((token) => token[0]).join('').slice(0, 6).toUpperCase();
}

const Portal = () => {
  const { showToast } = useAppToast();
  const authUser = useAuthUser();

  const [summary, setSummary] = useState<StudentPortalSummaryResponse | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isOpeningElibro, setIsOpeningElibro] = useState(false);

  const isValidElibroRedirectUrl = useCallback((value?: string | null) => {
    if (!value) return false;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
      return false;
    }
  }, []);

  const loadSummary = useCallback(async () => {
    setIsSummaryLoading(true);
    setSummaryError(null);

    try {
      const response = await getStudentPortalSummary();
      setSummary(response);
    } catch (error) {
      const message = resolveErrorMessage(error);
      setSummaryError(message);
      showToast({
        severity: 'warning',
        title: 'No se pudo cargar el resumen',
        description: message,
      });
    } finally {
      setIsSummaryLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const handleElibroAccess = useCallback(async () => {
    const disabledReason = resolveDisabledReason(summary);
    if (disabledReason) {
      showToast({
        severity: 'warning',
        title: 'Acceso no disponible',
        description: disabledReason,
      });
      return;
    }

    setIsOpeningElibro(true);

    try {
      const access = await requestStudentElibroAccess();
      if (!isValidElibroRedirectUrl(access?.redirectUrl)) {
        throw new Error('La URL de redirección de eLibro no es válida.');
      }

      const openedWindow = window.open(access.redirectUrl, '_blank', 'noopener,noreferrer');
      if (!openedWindow) {
        showToast({
          severity: 'warning',
          title: 'Popup bloqueado',
          description: 'Permite ventanas emergentes para abrir eLibro en una pestaña nueva.',
        });
        return;
      }
      openedWindow.focus?.();
      void loadSummary();
    } catch (error) {
      showToast({
        severity: 'error',
        title: 'No se pudo abrir eLibro',
        description: resolveErrorMessage(error),
      });
    } finally {
      setIsOpeningElibro(false);
    }
  }, [isValidElibroRedirectUrl, loadSummary, showToast, summary]);

  const activityItems = useMemo<ActivityItem[]>(() => {
    if (!summary) {
      return [
        {
          id: 'no-summary',
          title: isSummaryLoading ? 'Cargando actividad...' : 'Sin actividad disponible',
          meta: summaryError || 'Aún no hay datos para mostrar.',
          tone: 'bg-info',
        },
      ];
    }

    const lastAccess = formatDateTime(summary.accessMetrics.ultimaFechaAcceso);

    return [
      {
        id: 'success-7d',
        title: `Accesos exitosos: ${summary.accessMetrics.accesosUltimos7Dias}`,
        meta: 'Últimos 7 días',
        tone: 'bg-success',
      },
      {
        id: 'failed-7d',
        title: `Intentos fallidos: ${summary.accessMetrics.intentosFallidos7Dias}`,
        meta: 'Últimos 7 días',
        tone: summary.accessMetrics.intentosFallidos7Dias > 0 ? 'bg-warning' : 'bg-success',
        badge: summary.accessMetrics.intentosFallidos7Dias > 0 ? 'Revisar' : undefined,
      },
      {
        id: 'last-access',
        title: 'Último acceso exitoso',
        meta: lastAccess,
        tone: 'bg-info',
      },
    ];
  }, [isSummaryLoading, summary, summaryError]);

  const displayName = summary?.personalInfo.name || authUser?.displayName || 'Estudiante';
  const displayEmail = authUser?.email || 'Sin correo disponible';
  const enrollmentId = summary?.personalInfo.enrollmentId || 'Sin matrícula';
  const career = summary?.personalInfo.career || 'Sin carrera asignada';
  const { firstNames: displayFirstNames, lastNames: displayLastNames } = useMemo(
    () => resolveStudentNameParts(displayName, authUser?.displayName),
    [authUser?.displayName, displayName],
  );
  const careerAcronym = useMemo(() => buildCareerAcronym(career), [career]);
  const streakDays = summary?.accessMetrics.rachaDiasConAcceso ?? 0;
  const isAccountActive = summary?.accountStatus.status === 'ACTIVE';
  const accountStatusTitle = isAccountActive ? 'Activo' : 'Inactivo';
  const accountStatusMessage =
    summary?.accountStatus.message ||
    (isAccountActive
      ? 'Sin restricciones. Tienes acceso completo a las colecciones digitales.'
      : 'Tu cuenta no puede acceder al portal por ahora.');
  const ctaDisabled = isSummaryLoading || isOpeningElibro || Boolean(resolveDisabledReason(summary));
  const ctaStatusMessage = isSummaryLoading
    ? 'Validando estado de cuenta...'
    : isAccountActive
      ? 'Autenticación segura vía SSO institucional'
      : 'Acceso temporalmente restringido';
  const cardHoverClass = 'transition-transform duration-300 will-change-transform hover:-translate-y-0.5 hover:scale-[1.01]';
  const portalGlassCardClass =
    'relative overflow-hidden rounded-3xl border border-white/70 bg-white/72 shadow-[0_22px_60px_rgba(15,23,42,0.14)] ring-1 ring-white/35 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/55 dark:shadow-[0_24px_70px_rgba(0,0,0,0.36)] dark:ring-white/5';

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="relative z-10 mx-auto flex h-full w-full max-w-full flex-1 items-center px-2 py-4 lg:px-4 lg:py-6">
        <div className="grid w-full grid-cols-1 gap-y-4 xl:grid-cols-12 xl:grid-rows-none xl:items-start xl:gap-x-4 xl:gap-y-5">
          <section className="xl:col-span-12">
            <ElibroCtaCard
              className={cn(
                cardHoverClass,
                'portal-cta-lg',
                'relative overflow-hidden rounded-[2rem] border border-white/75 bg-white/75 shadow-[0_26px_72px_rgba(15,23,42,0.16)] ring-1 ring-white/40 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/55 dark:shadow-[0_28px_80px_rgba(0,0,0,0.4)] dark:ring-white/5',
              )}
              onTrigger={handleElibroAccess}
              busy={isOpeningElibro}
              disabled={ctaDisabled}
              statusMessage={ctaStatusMessage}
              errorMessage={summaryError}
              onRetry={loadSummary}
            />
          </section>

          <section className="grid min-h-0 gap-4 xl:col-span-12 xl:grid-rows-[auto_1fr]">
            <div className="grid grid-cols-1 gap-4">
              <Card
                className={cn(
                  portalGlassCardClass,
                  'p-4 md:p-5',
                  cardHoverClass,
                )}
              >
                <div className="mb-2.5 flex items-center text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <User className="mr-2 h-4 w-4" />
                  Información del estudiante
                </div>

                <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <span className="mb-1 block text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      Nombre:
                    </span>
                    <div className="text-sm font-medium text-foreground lg:text-base">{displayFirstNames} {displayLastNames}</div>
                  </div>
                  <div>
                    <span className="mb-1 block text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      Correo institucional:
                    </span>
                    <div className="truncate text-sm font-medium text-foreground lg:text-base">{displayEmail}</div>
                  </div>

                  <div>
                    <span className="mb-1 block text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      Matrícula:
                    </span>
                    <div className="font-mono text-sm font-medium text-foreground lg:text-base">{enrollmentId}</div>
                  </div>

                  <div className="xl:col-span-1">
                    <span className="mb-1 block text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      Carrera:
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-medium leading-5 text-foreground">{career}</div>
                      <span className="rounded-full border border-primary/35 bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                        {careerAcronym}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch lg:gap-4">
              <Card
                className={cn(
                  portalGlassCardClass,
                  'p-4 md:p-5 lg:col-span-4',
                  cardHoverClass,
                )}
              >
                <div className="mb-2.5 flex items-center justify-between">
                  <h3 className="flex items-center text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <Clock3 className="mr-2 h-4 w-4" />
                    Accesos recientes
                  </h3>

                  <span className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                    Últimos 7 días
                  </span>
                </div>

                <div className="relative space-y-2 pl-1">
                  <div className="absolute bottom-1 left-[0.4rem] top-1 w-px bg-border/60" />

                  {activityItems.map((item) => (
                    <div key={item.id} className="relative flex gap-4 pl-6">
                      <div
                        className={`absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full ${item.tone} ring-4 ring-background/75`}
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-medium text-foreground">{item.title}</span>
                          {item.badge ? (
                            <span className="rounded-md bg-warning/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-warning">
                              {item.badge}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">{item.meta}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="grid min-h-0 grid-cols-1 gap-2.5 lg:col-span-8 lg:grid-cols-2">
                <Card
                  className={cn(
                    portalGlassCardClass,
                    'group flex min-h-0 flex-1 flex-col p-4 md:p-5',
                    portalEffects.zapTrailGroup,
                    cardHoverClass,
                  )}
                >
                  <div className={cn('absolute bottom-0 right-0 translate-x-3 translate-y-3 opacity-16', portalEffects.readingZapIcon)}>
                    <Zap className={cn('h-24 w-24 text-emerald-500/65', portalEffects.readingZap)} strokeWidth={1.25} />
                  </div>

                  <div className="relative z-10 flex flex-1 flex-col justify-center">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Racha de lectura
                    </span>

                    <div className="flex items-end gap-2">
                      <span className="bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-4xl font-extrabold text-transparent lg:text-[2.5rem]">
                        {streakDays}
                      </span>
                      <span className="pb-0.5 text-sm font-medium text-muted-foreground">días</span>
                    </div>

                    <span className="mt-1.5 flex items-center text-[11px] font-medium text-primary">
                      <ArrowRight className="mr-1 h-3 w-3 rotate-[-45deg]" />
                      {streakDays > 0 ? 'Excelente consistencia' : 'Comienza tu racha hoy'}
                    </span>
                  </div>
                </Card>

                <Card
                  className={cn(
                    portalGlassCardClass,
                    'flex min-h-0 flex-1 flex-col p-4 md:p-5',
                    cardHoverClass,
                  )}
                >
                  <div className="mb-2 flex items-center text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Estado actual de la cuenta
                  </div>

                  <div className="flex flex-1 flex-col justify-center">
                    <div className="mb-2 flex items-end gap-3">
                      <div
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-xl',
                          isAccountActive ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning',
                        )}
                      >
                        <ShieldCheck className="h-4.5 w-4.5" />
                      </div>
                      <span className="text-lg font-bold text-foreground">{accountStatusTitle}</span>
                    </div>

                    <p className="text-sm leading-5 text-muted-foreground">
                      {isAccountActive ? (
                        <>
                          <span className="font-medium text-success">Sin restricciones.</span>{' '}
                          {accountStatusMessage}
                        </>
                      ) : (
                        <>
                          <span className="font-medium text-warning">Acceso restringido.</span>{' '}
                          {accountStatusMessage}
                        </>
                      )}
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Portal;
