import type { FilterFieldConfig } from '@/shared/components/table-filters'
import type { StudentBackendSex, StudentBackendStatus } from '@/features/students/api/students-api'
import type { CareerDto } from '@/features/careers/api/careers-api'

export type StudentsTableFilters = {
  institutionalEmail: string
  careerCode: string
  sex: 'todos' | StudentBackendSex
  quarter: 'todos' | string
  status: 'todos' | StudentBackendStatus
}

export const DEFAULT_STUDENTS_TABLE_FILTERS: StudentsTableFilters = {
  institutionalEmail: '',
  careerCode: 'todas',
  sex: 'todos',
  quarter: 'todos',
  status: 'todos',
}

export function buildStudentsFilterFields(careers: CareerDto[]): FilterFieldConfig[] {
  return [
    {
      id: 'institutionalEmail',
      type: 'text',
      label: 'Correo institucional (sin dominio)',
      placeholder: 'Ej. 2026001 o nombre.apellido',
    },
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
      id: 'sex',
      type: 'select',
      label: 'Sexo',
      options: [
        { label: 'Todos', value: 'todos' },
        { label: 'Mujer', value: 'FEMALE' },
        { label: 'Hombre', value: 'MALE' },
        { label: 'Otro', value: 'NON_BINARY' },
      ],
    },
    {
      id: 'quarter',
      type: 'select',
      label: 'Cuatrimestre',
      options: [
        { label: 'Todos', value: 'todos' },
        ...Array.from({ length: 11 }, (_, idx) => {
          const q = idx + 1
          return { label: `${q}°`, value: String(q) }
        }),
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
        { label: 'Deshabilitados', value: 'INACTIVE' },
      ],
    },
  ]
}
