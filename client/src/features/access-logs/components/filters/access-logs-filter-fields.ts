import type { FilterFieldConfig } from '@/shared/components/table-filters'
import type {
  AccessLogActorType,
  AccessLogResult,
  AccessLogScope,
} from '@/shared/types/api'
import type { AccessLogQueryParams } from '@/features/access-logs/api/access-logs-api'

export type AccessLogsFilters = {
  actorType: AccessLogActorType
  scope: AccessLogScope
  result: AccessLogResult | ''
  dateFrom: string
  dateTo: string
  studentId: string
  adminId: string
  careerId: string
  search: string
  sort: AccessLogQueryParams['sort']
}

export const DEFAULT_ACCESS_LOGS_FILTERS: AccessLogsFilters = {
  actorType: 'ALL',
  scope: 'ALL',
  result: '',
  dateFrom: '',
  dateTo: '',
  studentId: '',
  adminId: '',
  careerId: '',
  search: '',
  sort: 'occurredAt,desc',
}

export const ACCESS_LOG_RESULT_OPTIONS = [
  'SUCCESS',
  'FAILED_INVALID_CREDENTIALS',
  'FAILED_STUDENT_NOT_FOUND',
  'FAILED_STUDENT_INACTIVE',
  'FAILED_ADMIN_INACTIVE',
  'FAILED_ACCOUNT_LOCKED',
  'FAILED_INVALID_GOOGLE_TOKEN',
  'FAILED_GOOGLE_PROVIDER_UNAVAILABLE',
  'FAILED_GOOGLE_PROVIDER_ERROR',
  'FAILED_GOOGLE_SUBJECT_MISMATCH',
  'FAILED_INSTITUTIONAL_DOMAIN',
  'FAILED_ELIBRO_CONFIG',
  'FAILED_NEXT_URL_VALIDATION',
  'FAILED_ELIBRO_API',
  'FAILED_ELIBRO_TIMEOUT',
  'FAILED_INTERNAL_ERROR',
] as const satisfies readonly AccessLogResult[]

export const ACCESS_LOGS_FILTER_FIELDS: FilterFieldConfig[] = [
  {
    id: 'actorType',
    type: 'select',
    label: 'Tipo de actor',
    options: [
      { label: 'Todos los actores', value: 'ALL' },
      { label: 'Estudiante', value: 'STUDENT' },
      { label: 'Administrador', value: 'ADMIN' },
    ],
  },
  {
    id: 'scope',
    type: 'select',
    label: 'Scope',
    options: [
      { label: 'Todos los scopes', value: 'ALL' },
      { label: 'SIGASe local', value: 'SIGASE_LOCAL' },
      { label: 'SIGASe Google', value: 'SIGASE_GOOGLE' },
      { label: 'eLibro', value: 'ELIBRO' },
      { label: 'Login admin', value: 'ADMIN_LOGIN' },
    ],
  },
  {
    id: 'result',
    type: 'select',
    label: 'Resultado',
    options: [
      { label: 'Todos los resultados', value: '' },
      ...ACCESS_LOG_RESULT_OPTIONS.map((result) => ({
        label: result,
        value: result,
      })),
    ],
  },
  {
    id: 'sort',
    type: 'select',
    label: 'Orden',
    options: [
      { label: 'Fecha: más reciente', value: 'occurredAt,desc' },
      { label: 'Fecha: más antigua', value: 'occurredAt,asc' },
      { label: 'Resultado A-Z', value: 'result,asc' },
      { label: 'Scope A-Z', value: 'scope,asc' },
    ],
  },
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
    id: 'studentId',
    type: 'text',
    label: 'Student ID',
    placeholder: 'ID de estudiante',
  },
  {
    id: 'adminId',
    type: 'text',
    label: 'Admin ID',
    placeholder: 'ID de administrador',
  },
  {
    id: 'careerId',
    type: 'text',
    label: 'Career ID',
    placeholder: 'ID de carrera',
  },
]
