import { DataTableFiltersPopover } from '@/shared/components/table-filters'
import {
  ADMINS_FILTER_FIELDS,
  DEFAULT_ADMINS_TABLE_FILTERS,
  type AdminsTableFilters,
} from './admins-filter-fields'

type AdminsFiltersPopoverProps = {
  draftFilters: AdminsTableFilters
  appliedFilters: AdminsTableFilters
  open: boolean
  onOpenChange: (open: boolean) => void
  onDraftChange: (next: AdminsTableFilters) => void
  onApply: () => void
  onReset: () => void
  onClear: () => void
}

export function AdminsFiltersPopover({
  draftFilters,
  appliedFilters,
  open,
  onOpenChange,
  onDraftChange,
  onApply,
  onReset,
  onClear,
}: AdminsFiltersPopoverProps) {
  return (
    <DataTableFiltersPopover<AdminsTableFilters>
      title="Filtros de administradores"
      fields={ADMINS_FILTER_FIELDS}
      value={draftFilters}
      activeCountValue={appliedFilters}
      defaultValue={DEFAULT_ADMINS_TABLE_FILTERS}
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
