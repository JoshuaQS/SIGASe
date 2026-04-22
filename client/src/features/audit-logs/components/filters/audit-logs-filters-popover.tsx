import { DataTableFiltersPopover } from '@/shared/components/table-filters'
import {
  AUDIT_LOGS_FILTER_FIELDS,
  DEFAULT_AUDIT_LOGS_FILTERS,
  type AuditLogsFilters,
} from './audit-logs-filter-fields'

type AuditLogsFiltersPopoverProps = {
  draftFilters: AuditLogsFilters
  appliedFilters: AuditLogsFilters
  open: boolean
  onOpenChange: (open: boolean) => void
  onDraftChange: (next: AuditLogsFilters) => void
  onApply: () => void
  onReset: () => void
  onClear: () => void
}

export function AuditLogsFiltersPopover({
  draftFilters,
  appliedFilters,
  open,
  onOpenChange,
  onDraftChange,
  onApply,
  onReset,
  onClear,
}: AuditLogsFiltersPopoverProps) {
  return (
    <DataTableFiltersPopover<AuditLogsFilters>
      title="Filtros de auditoría"
      fields={AUDIT_LOGS_FILTER_FIELDS}
      value={draftFilters}
      activeCountValue={appliedFilters}
      defaultValue={DEFAULT_AUDIT_LOGS_FILTERS}
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
