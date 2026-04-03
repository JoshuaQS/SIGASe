import { CheckCircle2, XCircle, Clock, RefreshCw, Zap, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface ElibroOperationalValidationCardProps {
  validation: {
    status: 'idle' | 'loading' | 'success' | 'error'
    message: string
    latency?: number
    checkedAt?: string
  }
  runtimeStatus: { lastValidationMessage: string | null }
  runtimeChecklist: {
    hasAuthToken: boolean
    hasChannelId: boolean
    hasChannelSecret: boolean
    validEndpoint: boolean
    buildableChannel: boolean
  }
}

function ChecklistItem({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      {ok ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
      <span className={`text-sm ${ok ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
      <Badge variant={ok ? 'success' : 'warning'} className="ml-auto h-5 px-2 text-[10px]">
        {ok ? 'OK' : 'Falta'}
      </Badge>
    </div>
  )
}

export function ElibroOperationalValidationCard({
  validation,
  runtimeStatus,
  runtimeChecklist,
}: ElibroOperationalValidationCardProps) {
  return (
    <Card className="border-border shadow-sm h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Validación operativa
          </CardTitle>
          {validation.status === 'success' && (
            <Badge variant="success" className="h-5 px-2 text-[10px]">{validation.latency} ms</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {validation.status === 'idle' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
            <Clock className="w-4 h-4 shrink-0" /> {runtimeStatus.lastValidationMessage || 'Sin validación activa.'}
          </div>
        )}
        {validation.status === 'loading' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
            <RefreshCw className="w-4 h-4 animate-spin shrink-0" /> Verificando…
          </div>
        )}
        {validation.status === 'success' && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 dark:border-emerald-400/30 dark:bg-emerald-500/10">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" />
              <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Conexión exitosa</span>
            </div>
            <p className="mt-0.5 pl-6 text-sm text-emerald-700 dark:text-emerald-300">{validation.message}</p>
          </div>
        )}
        {validation.status === 'error' && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-destructive shrink-0" />
              <span className="text-sm font-semibold text-destructive">Error de conexión</span>
            </div>
          </div>
        )}
        <Separator />
        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Checklist</p>
          <ChecklistItem label="Auth Token presente" ok={runtimeChecklist.hasAuthToken} />
          <ChecklistItem label="Channel ID presente" ok={runtimeChecklist.hasChannelId} />
          <ChecklistItem label="Channel Secret presente" ok={runtimeChecklist.hasChannelSecret} />
          <ChecklistItem label="Endpoint válido" ok={runtimeChecklist.validEndpoint} />
          <ChecklistItem label="Canal construible" ok={runtimeChecklist.buildableChannel} />
        </div>
        {validation.checkedAt && <p className="text-[11px] text-muted-foreground text-right">Verificado: {validation.checkedAt}</p>}
      </CardContent>
    </Card>
  )
}
