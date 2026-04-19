import { motion } from 'framer-motion'
import { ArrowRight, Clock3, ShieldCheck, User, Zap } from 'lucide-react'
import { useCallback } from 'react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAuthUser } from '@/features/auth/hooks/use-auth-user'
import { changeStudentPassword, confirmStudentPasswordReset } from '@/features/auth/api/auth-api'
import { authSession } from '@/features/auth/store/auth-session-store'
import ForceTopBar from '@/features/student-portal/components/layout/force-top-bar'
import { StudentForcePasswordChangeView } from '@/features/student-portal/components/force-password-change-form'
import portalEffects from '@/features/student-portal/pages/portal-effects.module.css'
import ElibroCtaCard from '@/features/student-portal/components/cta-card/elibro-cta-card'

import { useAppToast } from '@/shared/components/ui/app-toast-provider'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import { Card } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'
import { ApiClientError } from '@/shared/lib/http/api-client'

type ActivityTone = 'bg-success' | 'bg-warning' | 'bg-info'

type ActivityItem = {
  id: string
  title: string
  meta: string
  tone: ActivityTone
  badge?: string
}

const activityItems: ActivityItem[] = [
  {
    id: 'success-7d',
    title: 'Accesos exitosos: 12',
    meta: 'Últimos 7 días',
    tone: 'bg-success',
  },
  {
    id: 'failed-7d',
    title: 'Intentos fallidos: 2',
    meta: 'Últimos 7 días',
    tone: 'bg-warning',
    badge: 'Revisar',
  },
  {
    id: 'last-access',
    title: 'Último acceso exitoso',
    meta: '14 abr 2026, 10:25 a. m.',
    tone: 'bg-info',
  },
]

function resolveErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message || 'No se pudo actualizar la contraseña.'
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'No se pudo actualizar la contraseña.'
}

export default function ForcePasswordChangeShell() {
  const displayFirstNames = 'Joshua'
  const displayLastNames = 'Pérez Gómez'
  const displayEmail = 'joshua@utez.edu.mx'
  const enrollmentId = '20223TN001'
  const career = 'Ingeniería en Desarrollo y Gestión de Software'
  const careerAcronym = 'IDGS'
  const streakDays = 7
  const isAccountActive = true
  const accountStatusTitle = isAccountActive ? 'Activo' : 'Inactivo'
  const accountStatusMessage = isAccountActive
    ? 'Sin restricciones. Tienes acceso completo a las colecciones digitales.'
    : 'Tu cuenta no puede acceder al portal por ahora.'
  const ctaStatusMessage = 'Autenticación segura vía SSO institucional'
  const cardHoverClass = 'transition-transform duration-300 will-change-transform hover:scale-[1.01]'

  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthUser()
  const { showToast } = useAppToast()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const token = new URLSearchParams(location.search).get('token')
  const isOnboardingFromEmail = Boolean(token && !user)

  const handleSubmit = useCallback(
    async ({ newPassword }: { newPassword: string }) => {
      try {
        if (isOnboardingFromEmail && token) {
          await confirmStudentPasswordReset(token, newPassword)
        } else {
          await changeStudentPassword(newPassword)
          // The backend rotates tokenVersion after password changes, so current token becomes stale.
          authSession.clearSession()
        }

        showToast({
          severity: 'success',
          title: 'Contraseña actualizada',
          description: 'Inicia sesión con tu nueva contraseña para continuar.',
        })

        return {
          success: true,
          message: 'Contraseña actualizada. Redirigiendo a inicio de sesión...',
        }
      } catch (error) {
        const message = resolveErrorMessage(error)
        showToast({
          severity: 'error',
          title: 'No se pudo actualizar la contraseña',
          description: message,
        })
        return { success: false, message }
      }
    },
    [isOnboardingFromEmail, showToast, token],
  )

  const handleCompleted = useCallback(() => {
    navigate('/login?mode=student', { replace: true, state: { mode: 'student' } })
  }, [navigate])

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      if (!isOnboardingFromEmail) {
        await authSession.logout()
      }
      navigate('/login?mode=student', { replace: true, state: { mode: 'student' } })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cerrar la sesión.'
      showToast({
        severity: 'error',
        title: 'Error al cerrar sesión',
        description: message,
      })
    } finally {
      setIsLoggingOut(false)
    }
  }, [isLoggingOut, isOnboardingFromEmail, navigate, showToast])

  return (
    <TooltipProvider delayDuration={0}>
      <div className="relative flex h-screen flex-col overflow-hidden bg-background">
        <ForceTopBar />

        <main className="relative z-10 min-h-0 flex-1 overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20 bg-background/10 backdrop-blur-xs"
          />
          <div className="relative z-10 mx-auto h-full max-w-[1800px] p-4 md:p-5">
            <motion.div
              className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="relative z-10 mx-auto flex h-full w-full max-w-full flex-1 items-center px-2 py-4 lg:px-4 lg:py-6">
                <div className="grid w-full grid-cols-1 gap-2.5 xl:grid-cols-12 xl:grid-rows-none xl:items-start xl:gap-x-4 xl:gap-y-2.5">
                  <section className="xl:col-span-12">
                    <ElibroCtaCard onTrigger={() => {}} statusMessage={ctaStatusMessage} />
                  </section>

                  <section className="grid min-h-0 gap-2.5 xl:col-span-12 xl:grid-rows-[auto_1fr]">
                    <div className="grid grid-cols-1 gap-2.5">
                      <Card
                        className={cn(
                          'rounded-2xl border border-border/50 bg-card/40 p-3.5 shadow-2xl shadow-primary/25 backdrop-blur-xl',
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
                            <div className="text-sm font-medium text-foreground lg:text-base">
                              {displayFirstNames} {displayLastNames}
                            </div>
                          </div>

                          <div>
                            <span className="mb-1 block text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                              Correo institucional:
                            </span>
                            <div className="truncate text-sm font-medium text-foreground lg:text-base">
                              {displayEmail}
                            </div>
                          </div>

                          <div>
                            <span className="mb-1 block text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                              Matrícula:
                            </span>
                            <div className="font-mono text-sm font-medium text-foreground lg:text-base">
                              {enrollmentId}
                            </div>
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

                    <div className="grid min-h-0 grid-cols-1 gap-2.5 lg:grid-cols-12 lg:items-stretch lg:gap-2.5">
                      <Card
                        className={cn(
                          'rounded-2xl border border-border/50 bg-card/40 p-3.5 shadow-2xl shadow-primary/25 backdrop-blur-xl lg:col-span-4',
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
                            'group relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/50 bg-card/40 p-3.5 shadow-2xl shadow-primary/25 backdrop-blur-xl',
                            portalEffects.zapTrailGroup,
                            cardHoverClass,
                          )}
                        >
                          <div
                            className={cn(
                              'absolute bottom-0 right-0 translate-x-3 translate-y-3 opacity-16',
                              portalEffects.readingZapIcon,
                            )}
                          >
                            <Zap
                              className={cn('h-24 w-24 text-emerald-500/65', portalEffects.readingZap)}
                              strokeWidth={1.25}
                            />
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
                            'flex min-h-0 flex-1 flex-col rounded-2xl border border-border/50 bg-card/40 p-3.5 shadow-2xl shadow-primary/25 backdrop-blur-xl',
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
                                  isAccountActive
                                    ? 'bg-success/15 text-success'
                                    : 'bg-warning/15 text-warning',
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
            </motion.div>
          </div>
        </main>

        {/* Overlay centrado: no mueve el layout del fondo */}
        <div className="pointer-events-none absolute inset-x-0 top-16 z-40 flex h-[calc(100%-4rem)] items-center justify-center px-4 py-6">
          <div className="pointer-events-auto w-full max-w-xl">
                          <StudentForcePasswordChangeView
                            studentName={user?.displayName}
                            onSubmit={handleSubmit}
                            onCompleted={handleCompleted}
                            onLogout={handleLogout}
                            logoutLoading={isLoggingOut}
                          />
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
