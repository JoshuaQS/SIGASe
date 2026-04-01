'use client';

import { button as Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings2 } from 'lucide-react';
import { ProtectedField } from '@/components/ui/forms/protected-field';
import type { DashboardSummaryResponse, ElibroConfigResponse } from '@/types/api';
import { PieChart, Pie, Cell } from 'recharts';
import { useMemo } from 'react';

type HealthTone = 'success' | 'warning' | 'danger' | 'neutral';
type HealthState = 'Operativo' | 'Degradado' | 'Caído' | 'Pendiente';

interface ElibroStatusViewProps {
  config?: ElibroConfigResponse | null;
  dashboard?: DashboardSummaryResponse | null;
  isTI?: boolean;
  onOpenConfig?: () => void;
  chartData?: { accesos: number; consultas: number; descargas: number }[];
}


const TONE_FILL: Record<HealthTone, string> = {
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  danger: 'hsl(var(--destructive))',
  neutral: 'hsl(var(--muted-foreground))',
};

const TONE_MAP: Record<HealthTone, "success" | "warning" | "destructive" | "muted"> = {
  success: 'success',
  warning: 'warning',
  danger: 'destructive',
  neutral: 'muted',
};

function PulseDot({ tone, size = 8 }: { tone: HealthTone; size?: number }) {
  const color = TONE_FILL[tone];
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      <span
        className="absolute inset-0 rounded-full opacity-40"
        style={{
          backgroundColor: color,
          animation: 'elibro-ping 1.2s cubic-bezier(0.2, 0, 0.2, 1) infinite',
        }}
      />
      <span
        className="relative inline-flex rounded-full"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          boxShadow: `0 0 0 2px color-mix(in srgb, ${color} 22%, transparent 78%)`,
          animation: 'elibro-dot 1.2s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes elibro-ping {
          0% { transform: scale(1); opacity: 0.78; }
          70% { transform: scale(3.2); opacity: 0; }
          100% { transform: scale(3.2); opacity: 0; }
        }
        @keyframes elibro-dot {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.14); }
        }
      `}</style>
    </span>
  );
}

function GaugeNeedle({
  value,
  data,
  cx,
  cy,
  innerRadius,
  outerRadius,
}: {
  value: number;
  data: { value: number }[];
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
}) {
  const total = data.reduce((acc, entry) => acc + entry.value, 0);
  const angle = 180 - (value / total) * 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.78;
  const rad = (Math.PI / 180) * angle;
  const x = cx + radius * Math.cos(rad);
  const y = cy - radius * Math.sin(rad);

  return (
    <g>
      <g
        style={{
          transformOrigin: `${cx}px ${cy}px`,
          animation:
            'needle-entry .95s cubic-bezier(.22,1,.36,1) forwards, needle-idle 1.8s ease-in-out 1s infinite alternate',
        }}
      >
        <line
          x1={cx}
          y1={cy}
          x2={x}
          y2={y}
          stroke="hsl(var(--foreground))"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={6} fill="hsl(var(--foreground))" />
      </g>
      <style>{`
        @keyframes needle-entry {
          0% { transform: translateY(24px) rotate(10deg); opacity: .2; }
          100% { transform: translateY(0) rotate(0deg); opacity: 1; }
        }
        @keyframes needle-idle {
          0% { transform: rotate(-1.25deg); }
          100% { transform: rotate(1.25deg); }
        }
      `}</style>
    </g>
  );
}

const ElibroStatusPanel = ({ onOpenConfig, chartData = [] }: ElibroStatusViewProps) => {
  const { healthSegments, activeHealth } = useMemo(() => {
    const totals = chartData.reduce(
      (acc, row) => ({
        accesos: acc.accesos + row.accesos,
        consultas: acc.consultas + row.consultas,
        descargas: acc.descargas + row.descargas,
      }),
      { accesos: 0, consultas: 0, descargas: 0 },
    );

    const base = [
      { key: 'Pendiente' as HealthState, value: Math.max(8, Math.round(chartData.length * 1.5)), tone: 'neutral' as HealthTone },
      { key: 'Caído' as HealthState, value: Math.max(10, totals.descargas), tone: 'danger' as HealthTone },
      { key: 'Degradado' as HealthState, value: Math.max(10, totals.consultas), tone: 'warning' as HealthTone },
      { key: 'Operativo' as HealthState, value: Math.max(10, totals.accesos), tone: 'success' as HealthTone },
    ];

    const sum = base.reduce((acc, item) => acc + item.value, 0) || 1;
    const normalized = base.map((item) => ({
      ...item,
      value: Math.max(6, Math.round((item.value / sum) * 100)),
    }));

    const latest = chartData[chartData.length - 1];
    const latestTotal = latest ? latest.accesos + latest.consultas + latest.descargas : 0;
    const healthRatio = latestTotal > 0 ? (latest.accesos / latestTotal) * 100 : 0;

    const state: HealthState =
      healthRatio >= 55 ? 'Operativo' :
        healthRatio >= 35 ? 'Degradado' :
          healthRatio >= 20 ? 'Caído' : 'Pendiente';

    const active = normalized.find((item) => item.key === state) ?? normalized[0];
    return { healthSegments: normalized, activeHealth: active };
  }, [chartData]);

  const activeIndex = healthSegments.findIndex((item) => item.key === activeHealth.key);
  const cumulativeValue = healthSegments.slice(0, activeIndex).reduce((acc, item) => acc + item.value, 0) + activeHealth.value / 2;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Estado del Sistema</h3>
            <p className="text-xs text-muted-foreground">Indicador operativo de conexión con eLibro</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 mt-[-30px]">
          <div className="flex w-full justify-center overflow-hidden">
            <PieChart width={520} height={280}>
              <Pie
                data={healthSegments}
                dataKey="value"
                startAngle={180}
                endAngle={0}
                cx={260}
                cy={246}
                innerRadius={88}
                outerRadius={128}
                paddingAngle={2.5}
                stroke="hsl(var(--background))"
                strokeWidth={2}
              >
                {healthSegments.map((entry) => (
                  <Cell key={entry.key} fill={TONE_FILL[entry.tone]} />
                ))}
              </Pie>
              <GaugeNeedle
                value={cumulativeValue}
                data={healthSegments}
                cx={260}
                cy={246}
                innerRadius={88}
                outerRadius={128}
              />
            </PieChart>
          </div>

          <div className="mx-auto grid w-full max-w-[520px] grid-cols-2 gap-2 md:grid-cols-4 mt-[-10px]">
            {[...healthSegments].reverse().map((item) => (
              <Badge
                key={item.key}
                variant={TONE_MAP[item.tone]}
                className="h-7 w-full justify-between rounded-md px-2.5 font-semibold text-[10px] ring-1 ring-inset ring-current/10"
              >
                <span className="flex items-center gap-1.5">
                  <PulseDot tone={item.tone} />
                  {item.key}
                </span>
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Credenciales</h3>
            <p className="text-xs text-muted-foreground">Configuración segura del canal</p>
          </div>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5" onClick={onOpenConfig}>
            <Settings2 className="h-3.5 w-3.5" />
            Configurar
          </Button>
        </div>

        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nombre del Canal</label>
            <input
              type="text"
              readOnly
              value="UTEZ Biblioteca Digital"
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none ring-0 transition-colors focus:border-primary/50"
            />
          </div>

          {['Channel ID', 'Channel Secret', 'Auth Token'].map((field) => (
            <ProtectedField
              key={field}
              label={field}
              value="••••••••••••••••"
              draftValue=""
              mode="view"
              reserveMessageSpace={false}
              className="space-y-0"
              description="Cifrado y protegido"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
export default ElibroStatusPanel;