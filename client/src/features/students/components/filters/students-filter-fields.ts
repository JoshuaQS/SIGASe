import type { FilterFieldConfig } from '@/shared/components/table-filters'
import type { StudentBackendStatus } from '@/features/students/api/students-api'
import type { CareerDto } from '@/features/careers/api/careers-api'

export type StudentsTableFilters = {
  careerCode: string
  status: 'todos' | StudentBackendStatus
}

export const DEFAULT_STUDENTS_TABLE_FILTERS: StudentsTableFilters = {
  careerCode: 'todas',
  status: 'todos',
}

export function buildStudentsFilterFields(careers: CareerDto[]): FilterFieldConfig[] {
  return [
    {
      id: 'careerCode',
      type: 'select',
      label: 'Carrera',
      options: [
        { label: 'Todas', value: 'todas' },
        ...careers.map((career) => ({
          label: career.code,
          value: career.code,
        })),
      ],
    },
    {
      id: 'status',
      type: 'select',
      label: 'Estado',
      options: [
        { label: 'Todos', value: 'todos' },
        { label: 'Pendientes', value: 'PENDING' },
        { label: 'Activos', value: 'ACTIVE' },
        { label: 'Inactivos', value: 'INACTIVE' },
      ],
    },
  ]
}
