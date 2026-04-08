import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Card } from '@/shared/components/ui/card'
import { motion } from 'framer-motion'

interface StatCardProps {
    title: string
    value: string | number
    subtitle?: string
    icon: React.ElementType
    iconBg?: string
    iconFg?: string
    trend?: number
    trendLabel?: string
    className?: string
    delay?: number
}

export default function StatCard({
    title, value, subtitle, icon: Icon,
    iconBg = 'bg-primary/10', iconFg = 'text-primary',
    trend, trendLabel, className, delay = 0,
}: StatCardProps) {
    const isPositive = trend !== undefined && trend > 0
    const isNegative = trend !== undefined && trend < 0

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.3 }}
        >
            <Card className={cn("p-5 hover:shadow-md transition-all duration-200 group", className)}>
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest truncate">{title}</p>
                        <p className="text-2xl font-bold text-foreground mt-2 leading-none tabular-nums">{value}</p>
                        {subtitle && <p className="text-xs text-muted-foreground mt-1.5 leading-tight">{subtitle}</p>}
                        {trend !== undefined && (
                            <div className={cn(
                                "flex items-center gap-1 mt-2 text-xs font-semibold",
                                isPositive ? "text-emerald-600" : isNegative ? "text-red-500" : "text-muted-foreground"
                            )}>
                                {isPositive
                                    ? <TrendingUp className="w-3 h-3" />
                                    : <TrendingDown className="w-3 h-3" />
                                }
                                <span>{isPositive ? '+' : ''}{trend}%</span>
                                {trendLabel && <span className="text-muted-foreground font-normal ml-0.5">{trendLabel}</span>}
                            </div>
                        )}
                    </div>
                    <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110", iconBg)}>
                        <Icon className={cn("w-5 h-5", iconFg)} />
                    </div>
                </div>
            </Card>
        </motion.div>
    )
}
