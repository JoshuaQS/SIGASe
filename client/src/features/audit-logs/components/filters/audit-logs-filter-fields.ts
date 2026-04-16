import type { FilterFieldConfig } from '@/shared/components/table-filters'
import type {
  AuditActorType,
  AuditOutcome,
  AuditSeverity,
} from '@/features/audit-logs/api/audit-logs-api'

export type AuditLogsFilters = {
  dateFrom: string
  dateTo: string
  search: string
  actorEmail: string
  action: string
  entityType: string
  requestId: string
  correlationId: string
  actorType: 'ALL' | AuditActorType
  outcome: 'ALL' | AuditOutcome
  severity: 'ALL' | AuditSeverity
}

export const DEFAULT_AUDIT_LOGS_FILTERS: AuditLogsFilters = {
  dateFrom: '',
  dateTo: '',
  search: '',
  actorEmail: '',
  action: '',
  entityType: '',
  requestId: '',
  correlationId: '',
  actorType: 'ALL',
  outcome: 'ALL',
  severity: 'ALL',
}

export const AUDIT_LOGS_FILTER_FIELDS: FilterFieldConfig[] = [
  {
    id: 'dateFrom',
    type: 'datetime-local',
    label: 'Fecha inicial',
  },
  {
    id: 'dateTo',
    type: 'datetime-local',
    label: 'Fecha final',
  },
  {
    id: 'actorEmail',
    type: 'text',
    label: 'Correo del actor',
    placeholder: 'actor@utez.edu.mx',
  },
  {
    id: 'action',
    type: 'text',
    label: 'Acción exacta',
    placeholder: 'admin.update',
  },
  {
    id: 'entityType',
    type: 'text',
    label: 'Entidad exacta',
    placeholder: 'STUDENT',
  },
  {
    id: 'requestId',
    type: 'text',
    label: 'Request ID',
    placeholder: 'requestId exacto',
  },
  {
    id: 'correlationId',
    type: 'text',
    label: 'Correlation ID',
    placeholder: 'correlationId exacto',
  },
  {
    id: 'actorType',
    type: 'select',
    label: 'Tipo de actor',
    options: [
      { label: 'Todos los actores', value: 'ALL' },
      { label: 'Admin', value: 'ADMIN' },
      { label: 'Sistema', value: 'SYSTEM' },
      { label: 'Integración', value: 'INTEGRATION' },
    ],
  },
  {
    id: 'outcome',
    type: 'select',
    label: 'Resultado',
    options: [
      { label: 'Todos los resultados', value: 'ALL' },
      { label: 'Exitoso', value: 'SUCCESS' },
      { label: 'Fallo', value: 'FAILURE' },
      { label: 'Denegado', value: 'DENIED' },
      { label: 'Error', value: 'ERROR' },
    ],
  },
  {
    id: 'severity',
    type: 'select',
    label: 'Severidad',
    options: [
      { label: 'Todas las severidades', value: 'ALL' },
      { label: 'Info', value: 'INFO' },
      { label: 'Notice', value: 'NOTICE' },
      { label: 'Warning', value: 'WARNING' },
      { label: 'Security', value: 'SECURITY' },
      { label: 'Critical', value: 'CRITICAL' },
    ],
  },
]
