'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, ScrollText } from 'lucide-react';
import { SectionHeader } from '@/components/ui/section-header';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { button as Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAppToast } from '@/components/ui/app-toast-provider';
import { getAccessLogs, type AccessLogDto, type AccessResult } from '@//lib/api/access-logs-api';

const PAGE_SIZE = 20;

const RESULT_OPTIONS: Array<{ value: 'ALL' | AccessResult; label: string }> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'SUCCESS', label: 'SUCCESS' },
  { value: 'FAILED_ELIBRO_API', label: 'FAILED_ELIBRO_API' },
  { value: 'FAILED_ELIBRO_CONFIG', label: 'FAILED_ELIBRO_CONFIG' },
  { value: 'FAILED_STUDENT_NOT_FOUND', label: 'FAILED_STUDENT_NOT_FOUND' },
  { value: 'FAILED_STUDENT_INACTIVE', label: 'FAILED_STUDENT_INACTIVE' },
  { value: 'FAILED_INTERNAL_ERROR', label: 'FAILED_INTERNAL_ERROR' },
];

function badgeVariantByResult(result: AccessResult): 'success' | 'destructive' | 'warning' | 'muted' {
  if (result === 'SUCCESS') return 'success';
  if (result === 'FAILED_ELIBRO_API' || result === 'FAILED_INTERNAL_ERROR') return 'destructive';
  if (result === 'FAILED_ELIBRO_CONFIG') return 'warning';
  return 'muted';
}

export default function AccessLogsSection() {
  const { showToast } = useAppToast();
  const [logs, setLogs] = useState<AccessLogDto[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [emailFilter, setEmailFilter] = useState('');
  const [ipFilter, setIpFilter] = useState('');
  const [resultFilter, setResultFilter] = useState<'ALL' | AccessResult>('ALL');

  const successfulInPage = useMemo(
    () => logs.filter((entry) => entry.result === 'SUCCESS').length,
    [logs],
  );

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const attemptedEmail = emailFilter.trim();
      const ipAddress = ipFilter.trim();
      const response = await getAccessLogs({
        attemptedEmail: attemptedEmail || undefined,
        ipAddress: ipAddress || undefined,
        result: resultFilter === 'ALL' ? undefined : resultFilter,
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
          : 'No se pudo cargar los access logs.',
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
        icon={ScrollText}
        title="Registros de Acceso"
        subtitle={`${totalElements} eventos · ${successfulInPage} éxitos en la página actual`}
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
                  description: 'No hay endpoint de exportación para access logs en esta fase.',
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
            <Input
              className="h-8 w-56 text-xs"
              placeholder="Correo intentado..."
              value={emailFilter}
              onChange={(event) => setEmailFilter(event.target.value)}
            />
            <Input
              className="h-8 w-40 text-xs"
              placeholder="IP..."
              value={ipFilter}
              onChange={(event) => setIpFilter(event.target.value)}
            />
            <Select value={resultFilter} onValueChange={(value) => setResultFilter(value as 'ALL' | AccessResult)}>
              <SelectTrigger className="h-8 w-60 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESULT_OPTIONS.map((option) => (
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
            <div className="p-4 text-sm text-muted-foreground">Cargando access logs...</div>
          ) : error ? (
            <div className="p-4 text-sm text-destructive">{error}</div>
          ) : logs.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">Sin resultados para los filtros seleccionados.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {['Fecha', 'Resultado', 'Correo', 'IP', 'Provider', 'Latency', 'Request ID'].map((header) => (
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
                      <td className="px-4 py-3">
                        <Badge variant={badgeVariantByResult(entry.result)} className="text-[10px]">
                          {entry.result}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground">
                        {entry.attemptedEmail ?? entry.normalizedEmail ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{entry.ipAddress ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{entry.providerName ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{entry.latencyMs != null ? `${entry.latencyMs} ms` : '—'}</td>
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
