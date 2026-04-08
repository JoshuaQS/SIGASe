import { useState } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check, Activity, ShieldCheck } from 'lucide-react'
import { Separator } from '@/shared/components/ui/separator'

type StatusKey = 'configured' | 'incomplete' | 'invalid' | 'pending'

interface ElibroServiceStatusPanelProps {
  statusKey: StatusKey
  integrationStateLabel: string
  runtimeStatus: {
    provider: string
    lastValidationAt: string | null
    updatedAt: string | null
    updatedByName: string
    nextUrl: string
  }
  runtimeChecklist: {
    hasAuthToken: boolean
    hasChannelId: boolean
    hasChannelSecret: boolean
    validEndpoint: boolean
    buildableChannel: boolean
  }
  formatRelativeTime: (iso?: string | null) => string
  formatDateTime: (iso?: string | null) => string
}

const STATUS_CONFIG: Record<
  StatusKey,
  {
    label: string
    sublabel: string
    dot: string
    ring: string
    soft: string
    pulse: boolean
  }
> = {
  configured: {
    label: 'Disponible',
    sublabel: 'Conexión SSO activa y validada',
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-500/20',
    soft: 'bg-emerald-500/8 text-emerald-700 dark:text-emerald-300',
    pulse: true,
  },
  incomplete: {
    label: 'Incompleto',
    sublabel: 'Configuración pendiente de completar',
    dot: 'bg-amber-400',
    ring: 'ring-amber-500/20',
    soft: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    pulse: false,
  },
  invalid: {
    label: 'No disponible',
    sublabel: 'Error de configuración detectado',
    dot: 'bg-destructive',
    ring: 'ring-destructive/20',
    soft: 'bg-destructive/10 text-destructive',
    pulse: false,
  },
  pending: {
    label: 'Pendiente',
    sublabel: 'Sin validación activa',
    dot: 'bg-muted-foreground/40',
    ring: 'ring-border',
    soft: 'bg-muted text-muted-foreground',
    pulse: false,
  },
}

function ChecklistChip({ label, ok, delay = 0 }: { label: string; ok: boolean; delay?: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      className={[
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium',
        ok
          ? 'border-emerald-500/15 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300'
          : 'border-amber-500/15 bg-amber-500/10 text-amber-700 dark:text-amber-300',
      ].join(' ')}
    >
      <span
        className={[
          'h-1.5 w-1.5 rounded-full',
          ok ? 'bg-emerald-500' : 'bg-amber-400',
        ].join(' ')}
      />
      {label}
    </motion.span>
  )
}

function MetaField({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={['space-y-1', className].join(' ')}>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-medium leading-6 text-foreground">{children}</dd>
    </div>
  )
}

export function ElibroServiceStatusPanel({
  statusKey,
  integrationStateLabel,
  runtimeStatus,
  runtimeChecklist,
  formatRelativeTime,
  formatDateTime,
}: ElibroServiceStatusPanelProps) {
  const [copied, setCopied] = useState(false)
  const cfg = STATUS_CONFIG[statusKey]

  const handleCopyNextUrl = async () => {
    await navigator.clipboard.writeText(runtimeStatus.nextUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="w-full">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)] lg:gap-10">
        {/* LEFT */}
        <div className="min-w-0 space-y-6">
          <div className="flex items-start gap-4">
            <div
              className={[
                'relative mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-8',
                cfg.ring,
              ].join(' ')}
            >
              {cfg.pulse && (
                <>
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0.5 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{
                      repeat: Infinity,
                      duration: 2,
                      ease: "easeOut"
                    }}
                    className={[
                      'absolute inset-0 rounded-full',
                      cfg.dot === 'bg-emerald-500' ? 'bg-emerald-500/40' : 'bg-amber-400/40'
                    ].join(' ')}
                  />
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0.3 }}
                    animate={{ scale: 1.6, opacity: 0 }}
                    transition={{
                      repeat: Infinity,
                      duration: 2,
                      delay: 0.8,
                      ease: "easeOut"
                    }}
                    className={[
                      'absolute inset-0 rounded-full',
                      cfg.dot === 'bg-emerald-500' ? 'bg-emerald-500/30' : 'bg-amber-400/30'
                    ].join(' ')}
                  />
                </>
              )}
              <span
                className={[
                  'relative block h-3 w-3 rounded-full',
                  cfg.dot,
                ].join(' ')}
              />
            </div>

            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                  {cfg.label}
                </h3>
                <span
                  className={[
                    'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold',
                    cfg.soft,
                  ].join(' ')}
                >
                  {integrationStateLabel}
                </span>
              </div>

              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                {cfg.sublabel}
              </p>
            </div>
          </div>

          <Separator />

          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
            <MetaField label="Estado de configuración">
              {integrationStateLabel}
            </MetaField>

            <MetaField label="Proveedor">
              {runtimeStatus.provider || 'Sin datos'}
            </MetaField>

            <MetaField label="Última validación">
              {formatRelativeTime(runtimeStatus.lastValidationAt)}
            </MetaField>

            <MetaField label="Última actualización">
              {formatDateTime(runtimeStatus.updatedAt)}
            </MetaField>

            <MetaField label="Actualizado por">
              {runtimeStatus.updatedByName || 'Sin datos'}
            </MetaField>

            <MetaField label="Next URL activa" className="sm:col-span-2 xl:col-span-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className="min-w-0 truncate font-mono text-[13px] text-foreground/90">
                  {runtimeStatus.nextUrl || 'Sin datos'}
                </span>

                {runtimeStatus.nextUrl ? (
                  <button
                    type="button"
                    title="Copiar next URL"
                    onClick={handleCopyNextUrl}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                ) : null}
              </div>
            </MetaField>
          </dl>
        </div>

        {/* RIGHT */}
        <aside className="min-w-0 lg:border-l lg:border-border lg:pl-8">
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Validación operativa
                </div>
                <p className="text-sm text-muted-foreground">
                  Checklist técnico de disponibilidad y consistencia.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <Activity className="h-3.5 w-3.5" />
                Activa
              </div>
            </div>

            <Separator />

            <div className="flex flex-wrap gap-2">
              <ChecklistChip label="Auth token" ok={runtimeChecklist.hasAuthToken} delay={0.1} />
              <ChecklistChip label="Channel ID" ok={runtimeChecklist.hasChannelId} delay={0.15} />
              <ChecklistChip label="Channel Secret" ok={runtimeChecklist.hasChannelSecret} delay={0.2} />
              <ChecklistChip label="Endpoint válido" ok={runtimeChecklist.validEndpoint} delay={0.25} />
              <ChecklistChip label="Configuración canal" ok={runtimeChecklist.buildableChannel} delay={0.3} />
            </div>

            <div className="grid gap-4 pt-1 sm:grid-cols-2 lg:grid-cols-1">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Última validación
                </p>
                <p className="text-sm font-medium text-foreground">
                  {formatRelativeTime(runtimeStatus.lastValidationAt)}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Última actualización
                </p>
                <p className="text-sm font-medium text-foreground">
                  {formatDateTime(runtimeStatus.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}
