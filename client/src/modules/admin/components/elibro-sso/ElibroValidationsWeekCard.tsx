import { motion } from 'framer-motion'
import { Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ElibroValidationsWeekCardProps {
  validationHistory: Array<{ day: string; ok: number; err: number }>
}

export function ElibroValidationsWeekCard({ validationHistory }: ElibroValidationsWeekCardProps) {
  return (
    <Card className="border-border shadow-sm h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" /> Validaciones · 7 días
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[220px] flex items-center">
        {validationHistory.length === 0 ? (
          <div className="w-full text-center text-sm text-muted-foreground">
            Sin validaciones registradas en los últimos 7 días.
          </div>
        ) : (
          <div className="w-full space-y-2">
            {validationHistory.map((d) => (
              <div key={d.day} className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground w-7 shrink-0">{d.day}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((d.ok / 16) * 100, 100)}%` }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-foreground tabular-nums w-4">{d.ok}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
