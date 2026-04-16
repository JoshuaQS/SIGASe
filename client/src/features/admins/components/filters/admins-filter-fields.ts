import type { FilterFieldConfig } from '@/shared/components/table-filters'
import type { AdminRole } from '@/features/admins/components/AdminsTable'
import type { AdminBackendStatus } from '@/features/admins/api/admins-api'

export type AdminsTableFilters = {
  role: 'todos' | AdminRole
  status: 'todos' | AdminBackendStatus
}

export const DEFAULT_ADMINS_TABLE_FILTERS: AdminsTableFilters = {
  role: 'todos',
  status: 'todos',
}

export const ADMINS_FILTER_FIELDS: FilterFieldConfig[] = [
  {
    id: 'role',
    type: 'select',
    label: 'Rol',
    options: [
      { label: 'Todos los roles', value: 'todos' },
      { label: 'Admin TI', value: 'ADMIN_TI' },
      { label: 'Admin Biblioteca', value: 'ADMIN_BIBLIOTECA' },
    ],
  },
  {
    id: 'status',
    type: 'select',
    label: 'Estado',
    options: [
      { label: 'Todos', value: 'todos' },
      { label: 'Activos', value: 'ACTIVE' },
      { label: 'Inactivos', value: 'INACTIVE' },
    ],
  },
]
