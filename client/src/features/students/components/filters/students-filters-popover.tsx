import { DataTableFiltersPopover } from '@/shared/components/table-filters'
import { buildStudentsFilterFields, type StudentsTableFilters } from './students-filter-fields'
import type { CareerDto } from '@/features/careers/api/careers-api'

type StudentsFiltersPopoverProps = {
  careers: CareerDto[]
  draftFilters: StudentsTableFilters
  appliedFilters: StudentsTableFilters
  open: boolean
  onOpenChange: (open: boolean) => void
  onDraftChange: (next: StudentsTableFilters) => void
  onApply: () => void
  onReset: () => void
  onClear: () => void
}

export function StudentsFiltersPopover({
  careers,
  draftFilters,
  appliedFilters,
  open,
  onOpenChange,
  onDraftChange,
  onApply,
  onReset,
  onClear,
}: StudentsFiltersPopoverProps) {
  const fields = buildStudentsFilterFields(careers)

  return (
    <DataTableFiltersPopover<StudentsTableFilters>
      title="Filtros de estudiantes"
      fields={fields}
      value={draftFilters}
      activeCountValue={appliedFilters}
      onChange={onDraftChange}
      onApply={onApply}
      onReset={onReset}
      onClear={onClear}
      open={open}
      onOpenChange={onOpenChange}
      align="end"
      side="bottom"
      className="min-w-[360px]"
    />
  )
}
