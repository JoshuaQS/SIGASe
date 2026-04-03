import { type ElementType, useEffect, useRef, useState } from 'react'
import { Activity } from 'lucide-react'
import { ResponsiveContainer, RadialBar, RadialBarChart } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ElibroGeneralStatusCardProps {
  uptimeChartData: Array<{ name: string; value: number; fill: string }>
  uptimePct: number | null
  uptimeStatusLabel: string
  uptimeStatusTone: { dot: string; text: string }
  statusInfo: { label: string; color: string; bg: string }
  statusIcon: ElementType
  runtimeStatus: {
    provider: string
    lastValidationAt: string | null
    updatedAt: string | null
    updatedByName: string
    endpoint: string
  }
  formatRelativeTime: (iso?: string | null) => string
  formatDateTime: (iso?: string | null) => string
}

export function ElibroGeneralStatusCard({
  uptimeChartData,
  uptimePct,
  uptimeStatusLabel,
  uptimeStatusTone,
  statusInfo,
  statusIcon: StatusIcon,
  runtimeStatus,
  formatRelativeTime,
  formatDateTime,
}: ElibroGeneralStatusCardProps) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null)
  const [isChartReady, setIsChartReady] = useState(false)

  useEffect(() => {
    if (!chartContainerRef.current) return

    const node = chartContainerRef.current
    const updateSize = () => {
      const { width, height } = node.getBoundingClientRect()
      setIsChartReady(width > 0 && height > 0)
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  return (
    <Card className="border-border shadow-sm h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" /> Estado general
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-full min-w-0">
            <div ref={chartContainerRef} className="relative h-[220px] min-h-[200px] w-full min-w-0">
              {isChartReady ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={200}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="92%" startAngle={90} endAngle={-270} data={uptimeChartData}>
                    <RadialBar dataKey="value" cornerRadius={8} />
                  </RadialBarChart>
                </ResponsiveContainer>
              ) : null}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Uptime semanal</p>
                <p className="text-2xl font-bold text-foreground tabular-nums leading-none mt-1">{uptimePct != null ? `${uptimePct.toFixed(1)}%` : 'Sin datos'}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Sin interrupciones</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${uptimeStatusTone.dot}`} />
                  <span className={`text-[10px] font-medium ${uptimeStatusTone.text}`}>{uptimeStatusLabel}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border ${statusInfo.bg}`}>
              <StatusIcon className={`w-4 h-4 ${statusInfo.color} flex-shrink-0`} />
              <span className={`text-sm font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
              <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="space-y-2.5 pt-1">
              {[
                { label: 'Proveedor', value: runtimeStatus.provider },
                { label: 'Última validación', value: formatRelativeTime(runtimeStatus.lastValidationAt) },
                { label: 'Última actualización', value: formatDateTime(runtimeStatus.updatedAt) },
                { label: 'Actualizado por', value: runtimeStatus.updatedByName || 'Sin datos' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-3">
                  <span className="text-sm leading-6 text-muted-foreground">{label}</span>
                  <span className="text-right text-sm leading-6 text-foreground">{value}</span>
                </div>
              ))}
              <div className="flex items-start justify-between gap-3">
                <span className="shrink-0 text-sm leading-6 text-muted-foreground">Endpoint activo</span>
                <span className="break-all text-right text-sm leading-6 text-foreground">{runtimeStatus.endpoint}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
