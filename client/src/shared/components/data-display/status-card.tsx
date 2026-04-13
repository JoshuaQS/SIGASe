import { TrendingUp, TrendingDown } from 'lucide-react'
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
  subtitle?: string
  icon: React.ElementType
  variant?: StatVariant
  trend?: number
  trendLabel?: string
  className?: string
  delay?: number
}

export default function StatCard({
  title, value, subtitle, icon: Icon,
  variant = 'primary',
  trend, trendLabel, className, delay = 0,
}: StatCardProps) {
  const v = variantStyles[variant]
  const isPositive = trend !== undefined && trend > 0
  const isNegative = trend !== undefined && trend < 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <Card className={cn('p-5 hover:shadow-md transition-all duration-200 group', className)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest truncate">
              {title}
            </p>
            <p className="text-2xl font-bold text-foreground mt-2 leading-none tabular-nums">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1.5 leading-tight">{subtitle}</p>
            )}
            {trend !== undefined && (
              <div className={cn(
                'flex items-center gap-1 mt-2 text-xs font-semibold',
                isPositive ? 'text-success' : isNegative ? 'text-destructive' : 'text-muted-foreground'
              )}>
                {isPositive
                  ? <TrendingUp className="w-3 h-3" />
                  : <TrendingDown className="w-3 h-3" />
                }
                <span>{isPositive ? '+' : ''}{trend}%</span>
                {trendLabel && (
                  <span className="text-muted-foreground font-normal ml-0.5">{trendLabel}</span>
                )}
              </div>
            )}
          </div>
          <div className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
            'transition-transform group-hover:scale-110',
            v.container
          )}>
            <Icon className={cn('w-5 h-5', v.icon)} />
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
