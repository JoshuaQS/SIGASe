import { useEffect, useRef, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'hsl(var(--foreground))',
}

interface ElibroLatencyCardProps {
  latencyHistory: Array<{ hora: string; ms: number }>
}

export function ElibroLatencyCard({ latencyHistory }: ElibroLatencyCardProps) {
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
    <Card className="h-full">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-semibold">Latencia del endpoint (últimas 24 h)</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Tiempo de respuesta en ms · POST /auth/sso/</p>
        </div>
        <Badge variant="secondary" className="text-[10px] px-2.5 h-5 font-medium">En vivo</Badge>
      </CardHeader>
      <CardContent className="h-[220px] min-w-0">
        {latencyHistory.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Sin datos de latencia en las últimas 24 horas.
          </div>
        ) : (
          <div ref={chartContainerRef} className="h-full w-full min-w-0">
            {isChartReady ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={200}>
                <AreaChart data={latencyHistory} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gL" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                  <XAxis dataKey="hora" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} unit=" ms" />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => {
                      const normalized = typeof value === 'number' ? value : Number(value ?? 0)
                      return [`${normalized} ms`, 'Latencia']
                    }}
                  />
                  <Area type="monotone" dataKey="ms" stroke="#6366f1" strokeWidth={2.5} fill="url(#gL)" dot={false} activeDot={{ r: 4, fill: '#6366f1' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
