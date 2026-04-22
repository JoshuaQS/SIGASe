import * as React from 'react'
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Calendar,
  CheckCircle,
  GraduationCap,
  Hash,
  Trophy,
  Users,
  XCircle,
  TrendingUp,
} from 'lucide-react'

import { AnimatedGradientText } from '@/shared/components/ui/animated-gradient-text'
import { Badge } from '@/shared/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'

export type AnalysisContextScope =
  | 'student-individual'
  | 'students-all'
  | 'students-top'
  | 'career-individual'
  | 'careers-multiple'
  | 'careers-multiple-top'
  | 'careers-all'
  | 'careers-all-top'

export type AnalysisAccessType = 'success' | 'failed' | 'both'
export type AnalysisSortOrder = 'asc' | 'desc'

export type ComposerAnalysisContextCardProps = {
  scope: AnalysisContextScope
  accessType: AnalysisAccessType
  title: string
  subtitle?: string
  identifier?: {
    label: string
    value: string
  }
  dateRange?:
    | {
        from: string
        to: string
        label?: string
      }
    | null
  sortOrder?: AnalysisSortOrder | null
  topN?: number | null
  careerCodes?: string[]
  className?: string
}

type PillTone =
  | 'primary' // teal
  | 'indigo'
  | 'amber'
  | 'success'
  | 'danger'
  | 'violet'
  | 'neutral'

type Pill = {
  icon: React.ElementType
  label: string
  tone: PillTone
}

function pillClassName(tone: PillTone) {
  switch (tone) {
    case 'primary':
      return 'border-teal-600 bg-teal-600 text-white'
    case 'indigo':
      return 'border-indigo-600 bg-indigo-600 text-white'
    case 'amber':
      return 'border-amber-500 bg-amber-500 text-white'
    case 'success':
      return 'border-emerald-600 bg-emerald-600 text-white'
    case 'danger':
      return 'border-rose-600 bg-rose-600 text-white'
    case 'violet':
      return 'border-violet-600 bg-violet-600 text-white'
    case 'neutral':
    default:
      return 'border-slate-600 bg-slate-600 text-white'
  }
}

function accessConfig(accessType: AnalysisAccessType) {
  if (accessType === 'success') {
    return {
      Icon: CheckCircle,
      label: 'Accesos: Exitosos',
      tone: 'success' as const,
    }
  }
  if (accessType === 'failed') {
    return { Icon: XCircle, label: 'Accesos: Fallidos', tone: 'danger' as const }
  }
  return { Icon: CheckCircle, label: 'Accesos: Ambos', tone: 'neutral' as const }
}

function formatSortOrder(sortOrder: AnalysisSortOrder) {
  return sortOrder === 'asc' ? 'Menor a mayor' : 'Mayor a menor'
}

function getInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  const a = parts[0]?.[0] ?? ''
  const b = parts[1]?.[0] ?? ''
  return `${a}${b}`.toUpperCase()
}

function scopeConfig(scope: AnalysisContextScope, title: string, topN?: number | null) {
  const initials = getInitials(title)
  const isTop = scope === 'students-top' || scope === 'careers-multiple-top' || scope === 'careers-all-top'

  const icon = (() => {
    if (scope === 'student-individual') {
      return <span className="text-base font-semibold tracking-tight text-white">{initials}</span>
    }
    if (isTop) {
      return <Trophy className="h-7 w-7 text-white" />
    }
    if (scope.startsWith('student') || scope === 'students-all') {
      return <Users className="h-7 w-7 text-white" />
    }
    return <GraduationCap className="h-7 w-7 text-white" />
  })()

  const iconClassName = (() => {
    if (isTop) return 'bg-amber-500 border-amber-500 text-white'
    if (scope.startsWith('student') || scope === 'students-all') return 'bg-teal-600 border-teal-600 text-white'
    return 'bg-indigo-600 border-indigo-600 text-white'
  })()

  const eyebrow = 'Alcance'

  const defaultSubtitle = (() => {
    if (scope === 'student-individual') return 'Estudiante'
    if (scope === 'students-all') return undefined
    if (scope === 'students-top') return 'Estudiantes · Todos'
    if (scope === 'career-individual') return 'Carrera seleccionada'
    if (scope === 'careers-multiple' || scope === 'careers-multiple-top') return undefined
    if (scope === 'careers-all' || scope === 'careers-all-top') return 'Carreras · Todas'
    return undefined
  })()

  const resolvedTitle = (() => {
    if (scope === 'students-top') return `Top ${topN ?? 'N'} estudiantes`
    if (scope === 'careers-all-top') return `Top ${topN ?? 'N'} carreras`
    return title
  })()

  const scopeBadge = (() => {
    if (scope === 'student-individual') {
      return { Icon: Users, label: 'Estudiantes · Individual', tone: 'primary' as const }
    }
    if (scope === 'students-all' || scope === 'students-top') {
      return { Icon: Users, label: 'Estudiantes · Todos', tone: 'primary' as const }
    }
    if (scope === 'career-individual') {
      return { Icon: GraduationCap, label: 'Carreras · Individual', tone: 'indigo' as const }
    }
    if (scope === 'careers-multiple' || scope === 'careers-multiple-top') {
      return { Icon: GraduationCap, label: 'Carreras Múltiples', tone: 'violet' as const }
    }
    return { Icon: GraduationCap, label: 'Carreras · Todas', tone: 'indigo' as const }
  })()

  return {
    eyebrow,
    title: resolvedTitle,
    subtitle: defaultSubtitle,
    icon,
    iconClassName,
    scopeBadge,
  }
}

function Header({ right }: { right?: React.ReactNode }) {
  const gradId = React.useId().replace(/:/g, '')
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2">
        <SparklesIcon gradId={gradId} />
        <AnimatedGradientText className="inline-block mb-1 text-lg font-semibold sm:text-xl">
          Contexto del análisis:
        </AnimatedGradientText>
      </div>
      {right}
    </div>
  )
}

function SparklesIcon({ gradId }: { gradId: string }) {
  return (
    <Trophy className="h-5 w-5" color={`url(#${gradId})`} strokeWidth={2.25} aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffaa40" />
          <stop offset="100%" stopColor="#9c40ff" />
        </linearGradient>
      </defs>
    </Trophy>
  )
}

function PillBadge({ pill }: { pill: Pill }) {
  const Icon = pill.icon
  return (
    <Badge variant="secondary" className={cn('gap-1 text-xs border', pillClassName(pill.tone))}>
      <Icon className="h-3.5 w-3.5" />
      {pill.label}
    </Badge>
  )
}

export function ComposerAnalysisContextCard(props: ComposerAnalysisContextCardProps) {
  const {
    scope,
    accessType,
    title,
    subtitle,
    identifier,
    dateRange,
    sortOrder,
    topN,
    careerCodes,
    className,
  } = props

  const access = accessConfig(accessType)
  const cfg = scopeConfig(scope, title, topN)
  const resolvedSubtitle = subtitle ?? cfg.subtitle

  const showTop = Boolean(topN) && (scope.includes('top') || scope === 'careers-multiple-top')
  const showOrder = Boolean(sortOrder)
  const showCareerCodes = Array.isArray(careerCodes) && careerCodes.length > 0

  const orderPill: Pill | null = showOrder
    ? {
        icon: sortOrder === 'asc' ? ArrowUpWideNarrow : ArrowDownWideNarrow,
        label: `Orden: ${formatSortOrder(sortOrder as AnalysisSortOrder)}`,
        tone: 'amber',
      }
    : null

  const topPill: Pill | null = showTop ? { icon: TrendingUp, label: `Top ${topN}`, tone: 'success' } : null

  const identifierPill: Pill | null = identifier ? { icon: Hash, label: `${identifier.label}: ${identifier.value}`, tone: 'amber' } : null

  const accessPill: Pill = { icon: access.Icon, label: access.label, tone: access.tone }

  const scopePill: Pill = { icon: cfg.scopeBadge.Icon, label: cfg.scopeBadge.label, tone: cfg.scopeBadge.tone }

  const careerPills: Pill[] = showCareerCodes ? careerCodes!.map((c) => ({ icon: GraduationCap, label: c, tone: 'violet' })) : []

  const pillRows: Pill[][] = [
    [identifierPill, accessPill, orderPill, topPill].filter(Boolean) as Pill[],
    [scopePill, ...careerPills].filter(Boolean) as Pill[],
  ].filter((r) => r.length > 0)

  const rangeBadge =
    dateRange && dateRange.from && dateRange.to ? (
      <Badge variant="secondary" className={cn('gap-1 text-xs border', pillClassName('neutral'))}>
        <Calendar className="h-3.5 w-3.5" />
        {dateRange.label ?? `${dateRange.from} – ${dateRange.to}`}
      </Badge>
    ) : null

  const hasSubtitle = Boolean(resolvedSubtitle)

  return (
    <Card className={cn('w-full overflow-hidden bg-card shadow-sm border-0', className)}>
      <CardHeader className="pb-3">
        <Header right={rangeBadge} />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="grid min-w-0 grid-cols-[auto_1fr] items-stretch gap-3 sm:basis-3/5">
            <div className={cn('grid min-h-16 shrink-0 place-items-center self-stretch aspect-square rounded-xl border', cfg.iconClassName)}>
              {cfg.icon}
            </div>
            <div className={cn('min-w-0', hasSubtitle ? 'pt-0.5' : 'flex flex-col justify-center')}>
              <p className="text-xs font-medium text-muted-foreground">{cfg.eyebrow}</p>
              <p className="mt-0.5 text-lg font-semibold leading-tight text-foreground">{cfg.title}</p>
              {resolvedSubtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{resolvedSubtitle}</p> : null}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 sm:basis-2/5">
            {pillRows.map((row, idx) => (
              <div key={idx} className="flex flex-wrap items-center justify-end gap-2">
                {row.map((p) => (
                  <PillBadge key={p.label} pill={p} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

