import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Card } from '@/shared/components/ui/card'
import { motion } from 'framer-motion'

export type StatVariant = 'primary' | 'success' | 'warning' | 'destructive' | 'info'

const variantStyles: Record<StatVariant, { container: string; icon: string }> = {
  primary:     { container: 'bg-primary/10',     icon: 'text-primary' },
  success:     { container: 'bg-success/10',     icon: 'text-success' },
  warning:     { container: 'bg-warning/10',     icon: 'text-warning' },
  destructive: { container: 'bg-destructive/10', icon: 'text-destructive' },
  info:        { container: 'bg-info/10',        icon: 'text-info' },
}

interface StatCardProps {
  title: string
  value: string | number
  valueClassName?: string
  subtitle?: string
  icon: React.ElementType
  variant?: StatVariant
  trend?: number
  trendLabel?: string
  className?: string
  delay?: number
}

export default function StatCard({
  title, value, valueClassName, subtitle, icon: Icon,
  variant = 'primary',
  trend, trendLabel, className, delay = 0,
}: StatCardProps) {
  const v = variantStyles[variant]
  const isPositive = trend !== undefined && trend > 0
  const isNegative = trend !== undefined && trend < 0
  const trendTone = isPositive ? 'text-emerald-600 dark:text-emerald-400' : isNegative ? 'text-destructive' : 'text-muted-foreground'
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight
  const trendValue = `${isPositive ? '+' : isNegative ? '-' : ''}${Math.abs(trend ?? 0).toFixed(1)}%`

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="h-full"
    >
      <Card className={cn('group h-full p-3.5 transition-all duration-200 hover:shadow-lg', className)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">
              {title}
            </p>
            <p
              className={cn(
                'text-2xl font-bold text-foreground mt-1 leading-none',
                typeof value === 'number' ? 'tabular-nums' : 'break-words',
                valueClassName,
              )}
            >
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{subtitle}</p>
            )}
            {trend !== undefined ? (
              <div className={cn('mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums leading-none', trendTone)}>
                <TrendIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{trendValue}</span>
                {trendLabel && (
                  <span className="font-medium text-muted-foreground">{trendLabel}</span>
                )}
              </div>
            ) : (
              <div className="mt-1.5 h-3.5" aria-hidden="true" />
            )}
          </div>
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
            'transition-transform group-hover:scale-110',
            v.container
          )}>
            <Icon className={cn('w-4.5 h-4.5', v.icon)} />
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
