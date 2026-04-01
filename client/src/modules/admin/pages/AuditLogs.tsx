'use client';

import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Download, RefreshCw } from 'lucide-react';
import { SectionHeader } from '@/components/ui/section-header';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { button as Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAppToast } from '@/components/ui/app-toast-provider';
import {
  getAuditLogs,
  type AuditActorType,
  type AuditLogParams,
  type AuditLogDto,
  type AuditOutcome,
  type AuditSeverity,
} from '@//lib/api/audit-logs-api';

const PAGE_SIZE = 20;

const SEVERITY_OPTIONS: Array<{ value: 'ALL' | AuditSeverity; label: string }> = [
  { value: 'ALL', label: 'Todas' },
  { value: 'INFO', label: 'INFO' },
  { value: 'WARN', label: 'WARN' },
  { value: 'CRITICAL', label: 'CRITICAL' },
];

const OUTCOME_OPTIONS: Array<{ value: 'ALL' | AuditOutcome; label: string }> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'SUCCESS', label: 'SUCCESS' },
  { value: 'FAILURE', label: 'FAILURE' },
];

const ACTOR_OPTIONS: Array<{ value: 'ALL' | AuditActorType; label: string }> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'ADMIN', label: 'ADMIN' },
  { value: 'STUDENT', label: 'STUDENT' },
  { value: 'SYSTEM', label: 'SYSTEM' },
  { value: 'INTEGRATION', label: 'INTEGRATION' },
];

const ACTION_OPTIONS: Array<{ value: 'ALL' | NonNullable<AuditLogParams['action']>; label: string }> = [
  { value: 'ALL', label: 'Todas' },
  { value: 'ADMIN_CREATE', label: 'ADMIN_CREATE' },
  { value: 'ADMIN_UPDATE', label: 'ADMIN_UPDATE' },
  { value: 'ADMIN_ACTIVATE', label: 'ADMIN_ACTIVATE' },
  { value: 'ADMIN_DEACTIVATE', label: 'ADMIN_DEACTIVATE' },
  { value: 'ADMIN_RESET_PASSWORD', label: 'ADMIN_RESET_PASSWORD' },
  { value: 'STUDENT_CREATE', label: 'STUDENT_CREATE' },
  { value: 'STUDENT_UPDATE', label: 'STUDENT_UPDATE' },
  { value: 'STUDENT_DEACTIVATE', label: 'STUDENT_DEACTIVATE' },
  { value: 'STUDENT_REACTIVATE', label: 'STUDENT_REACTIVATE' },
  { value: 'ELIBRO_CONFIG_CREATE', label: 'ELIBRO_CONFIG_CREATE' },
  { value: 'ELIBRO_CONFIG_UPDATE', label: 'ELIBRO_CONFIG_UPDATE' },
  { value: 'ELIBRO_CONFIG_ACTIVATE', label: 'ELIBRO_CONFIG_ACTIVATE' },
  { value: 'ELIBRO_CONFIG_DEACTIVATE', label: 'ELIBRO_CONFIG_DEACTIVATE' },
  { value: 'ELIBRO_CONFIG_VALIDATE', label: 'ELIBRO_CONFIG_VALIDATE' },
  { value: 'STUDENT_IMPORT', label: 'STUDENT_IMPORT' },
];

const ENTITY_OPTIONS: Array<{ value: 'ALL' | NonNullable<AuditLogParams['entityType']>; label: string }> = [
  { value: 'ALL', label: 'Todas' },
  { value: 'ADMIN', label: 'ADMIN' },
  { value: 'STUDENT', label: 'STUDENT' },
  { value: 'ELIBRO_CONFIG', label: 'ELIBRO_CONFIG' },
  { value: 'STUDENT_IMPORT', label: 'STUDENT_IMPORT' },
];

function severityVariant(severity: AuditSeverity | null): 'success' | 'warning' | 'destructive' | 'muted' {
  if (severity === 'CRITICAL') return 'destructive';
  if (severity === 'WARN') return 'warning';
  if (severity === 'INFO') return 'success';
  return 'muted';
}

export default function AuditLogsSection() {
  const { showToast } = useAppToast();
  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState<'ALL' | NonNullable<AuditLogParams['action']>>('ALL');
  const [entityFilter, setEntityFilter] = useState<'ALL' | NonNullable<AuditLogParams['entityType']>>('ALL');
  const [actorFilter, setActorFilter] = useState<'ALL' | AuditActorType>('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState<'ALL' | AuditOutcome>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | AuditSeverity>('ALL');

  const criticalInPage = useMemo(
    () => logs.filter((entry) => entry.severity === 'CRITICAL').length,
    [logs],
  );

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAuditLogs({
        actorType: actorFilter === 'ALL' ? undefined : actorFilter,
        action: actionFilter === 'ALL' ? undefined : actionFilter,
        entityType: entityFilter === 'ALL' ? undefined : entityFilter,
        outcome: outcomeFilter === 'ALL' ? undefined : outcomeFilter,
        severity: severityFilter === 'ALL' ? undefined : severityFilter,
        page,
        size: PAGE_SIZE,
        sortBy: 'occurredAt',
        sortDir: 'desc',
      });
      setLogs(response.content);
      setTotalElements(response.totalElements);
      setTotalPages(response.totalPages);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo cargar los audit logs.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, [page]);

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={ClipboardList}
        title="Registros de Auditoría"
        subtitle={`${totalElements} eventos · ${criticalInPage} críticos en la página actual`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => void loadLogs()}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                showToast({
                  severity: 'warning',
                  title: 'Export no disponible',
                  description: 'No hay endpoint de exportación para audit logs en esta fase.',
                })
              }
            >
              <Download className="h-3.5 w-3.5" />
              Exportar
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="text-sm font-semibold">Filtros</div>
          <div className="flex flex-wrap gap-2">
            <Select value={actionFilter} onValueChange={(value) => setActionFilter(value as 'ALL' | NonNullable<AuditLogParams['action']>)}>
              <SelectTrigger className="h-8 w-56 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={(value) => setEntityFilter(value as 'ALL' | NonNullable<AuditLogParams['entityType']>)}>
              <SelectTrigger className="h-8 w-48 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actorFilter} onValueChange={(value) => setActorFilter(value as 'ALL' | AuditActorType)}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTOR_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={outcomeFilter} onValueChange={(value) => setOutcomeFilter(value as 'ALL' | AuditOutcome)}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTCOME_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={(value) => setSeverityFilter(value as 'ALL' | AuditSeverity)}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setPage(0);
                void loadLogs();
              }}
            >
              Aplicar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">Cargando audit logs...</div>
          ) : error ? (
            <div className="p-4 text-sm text-destructive">{error}</div>
          ) : logs.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">Sin resultados para los filtros seleccionados.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {['Fecha', 'Actor', 'Acción', 'Entidad', 'Outcome', 'Severity', 'Request ID'].map((header) => (
                      <th key={header} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((entry) => (
                    <tr key={entry.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(entry.occurredAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground">
                        {entry.actorAdminEmail ?? entry.actorReference ?? 'SYSTEM'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{entry.action}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{entry.entityType ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={entry.outcome === 'FAILURE' ? 'destructive' : 'success'} className="text-[10px]">
                          {entry.outcome ?? '—'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={severityVariant(entry.severity)} className="text-[10px]">
                          {entry.severity ?? '—'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{entry.requestId ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-xs text-muted-foreground">
              Mostrando {logs.length === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalElements)} de {totalElements}
            </span>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === 0} onClick={() => setPage((prev) => prev - 1)}>
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((prev) => prev + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
