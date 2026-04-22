export type FilterPrimitiveValue = string;
export type FilterArrayValue = string[];
export type FilterValue = FilterPrimitiveValue | FilterArrayValue | null;

export type FilterState = Record<string, FilterValue>;

export type FilterOption = {
  label: string;
  value: string;
};

export type TextFilterFieldConfig = {
  id: string;
  type: "text";
  label: string;
  placeholder?: string;
  defaultValue?: FilterValue;
};

export type SearchFilterFieldConfig = {
  id: string;
  type: "search";
  label?: string;
  placeholder?: string;
  defaultValue?: FilterValue;
};

export type MultiSelectFilterFieldConfig = {
  id: string;
  type: "multi-select";
  label: string;
  options: FilterOption[];
  defaultValue?: FilterValue;
};

export type SelectFilterFieldConfig = {
  id: string;
  type: "select";
  label: string;
  options: FilterOption[];
  placeholder?: string;
  defaultValue?: FilterValue;
};

export type DateTimeLocalFilterFieldConfig = {
  id: string;
  type: "datetime-local";
  label: string;
  min?: string;
  max?: string;
  step?: number;
  defaultValue?: FilterValue;
};

export type FilterFieldConfig =
  | TextFilterFieldConfig
  | SearchFilterFieldConfig
  | MultiSelectFilterFieldConfig
  | SelectFilterFieldConfig
  | DateTimeLocalFilterFieldConfig;

export type TableFilterPanelProps<TState extends FilterState = FilterState> = {
  title?: string;
  fields: FilterFieldConfig[];
  value: TState;
  defaultValue?: TState;
  onChange: (next: TState) => void;
  onApply?: () => void;
  onClear?: () => void;
  onReset?: () => void;
  onCancel?: () => void;
  className?: string;
};

export type ActiveFilterChip = {
  key: string;
  fieldId: string;
  label: string;
  value: string;
  removableValue?: string;
};
