import { Clock, Filter, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ActivityRow {
  action: string
  description: string
  user: string
  time: string
  type: 'success' | 'warning' | 'info' | 'error'
  ip: string
}

interface ElibroRecentActivityCardProps {
  filteredActivity: ActivityRow[]
  totalRows: number
  activitySearch: string
  activityTypeFilter: 'todos' | 'success' | 'warning' | 'info' | 'error'
  onSearchChange: (value: string) => void
  onFilterChange: (value: 'todos' | 'success' | 'warning' | 'info' | 'error') => void
}

export function ElibroRecentActivityCard({
  filteredActivity,
  totalRows,
  activitySearch,
  activityTypeFilter,
  onSearchChange,
  onFilterChange,
}: ElibroRecentActivityCardProps) {
  const typeBadgeVariant = {
    success: 'success',
    warning: 'warning',
    info: 'info',
    error: 'destructive',
  } as const

  const typeLabel = {
    success: 'SUCCESS',
    warning: 'WARN',
    info: 'INFO',
    error: 'ERROR',
  } as const

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Actividad reciente
          </CardTitle>
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Actor, acción, descripción o IP..."
                className="pl-9 h-8 text-sm"
                value={activitySearch}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </div>
            <Select value={activityTypeFilter} onValueChange={onFilterChange}>
              <SelectTrigger className="w-40 h-8 text-sm">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="ml-auto text-xs">{filteredActivity.length} eventos</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border bg-muted/40">
                {['Hora', 'Actor', 'Acción', 'Descripción', 'IP', 'Tipo'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredActivity.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Sin actividad reciente para los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredActivity.map((activity, i) => (
                  <tr key={`${activity.action}-${activity.time}-${i}`} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{activity.time}</td>
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap text-sm">{activity.user}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{activity.action}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[420px] truncate">{activity.description}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{activity.ip}</td>
                    <td className="px-4 py-3">
                      <Badge variant={typeBadgeVariant[activity.type]} className="text-[10px]">
                        {typeLabel[activity.type]}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-xs text-muted-foreground">Mostrando {filteredActivity.length} de {totalRows} eventos recientes</span>
        </div>
      </CardContent>
    </Card>
  )
}
