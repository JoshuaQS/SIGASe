import { DataTableFiltersPopover } from '@/shared/components/table-filters'
import {
  ACCESS_LOGS_FILTER_FIELDS,
  DEFAULT_ACCESS_LOGS_FILTERS,
  type AccessLogsFilters,
} from './access-logs-filter-fields'

type AccessLogsFiltersPopoverProps = {
  draftFilters: AccessLogsFilters
  appliedFilters: AccessLogsFilters
  open: boolean
  onOpenChange: (open: boolean) => void
  onDraftChange: (next: AccessLogsFilters) => void
  onApply: () => void
  onReset: () => void
  onClear: () => void
}

export function AccessLogsFiltersPopover({
  draftFilters,
  appliedFilters,
  open,
  onOpenChange,
  onDraftChange,
  onApply,
  onReset,
  onClear,
}: AccessLogsFiltersPopoverProps) {
  return (
    <DataTableFiltersPopover<AccessLogsFilters>
      title="Filtros de access logs"
      fields={ACCESS_LOGS_FILTER_FIELDS}
      value={draftFilters}
      activeCountValue={appliedFilters}
      defaultValue={DEFAULT_ACCESS_LOGS_FILTERS}
      onChange={onDraftChange}
      onApply={onApply}
      onReset={onReset}
      onClear={onClear}
      open={open}
      onOpenChange={onOpenChange}
      align="end"
      side="bottom"
      className="min-w-[420px]"
    />
  )
}
