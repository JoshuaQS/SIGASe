import type {
    ActiveFilterChip,
    FilterFieldConfig,
    FilterState,
    FilterValue,
  } from "./filter-types";
  
  export const cn = (...classes: Array<string | false | null | undefined>) =>
    classes.filter(Boolean).join(" ");
  
  export const updateFilterValue = (
    state: FilterState,
    key: string,
    value: FilterValue,
  ): FilterState => ({
    ...state,
    [key]: value,
  });
  
  export const toggleMultiValue = (
    state: FilterState,
    key: string,
    option: string,
  ): FilterState => {
    const current = Array.isArray(state[key]) ? state[key] : [];
    const exists = current.includes(option);
  
    return {
      ...state,
      [key]: exists ? current.filter((item) => item !== option) : [...current, option],
    };
  };
  
export const removeSingleFilterValue = (
  state: FilterState,
  key: string,
  fallbackValue: FilterValue = "",
): FilterState => ({
    ...state,
    [key]: fallbackValue,
  });
  
  export const removeMultiFilterValue = (
    state: FilterState,
    key: string,
    option: string,
  ): FilterState => {
    const current = Array.isArray(state[key]) ? state[key] : [];
  
    return {
      ...state,
      [key]: current.filter((item) => item !== option),
    };
  };
  
function normalizeSingleValue(item: FilterValue) {
  if (Array.isArray(item)) {
    return item;
  }
  if (typeof item === "string") {
    return item.trim();
  }
  return item ?? "";
}

function normalizeArrayValue(value: string[]) {
  return [...value].map((item) => item.trim()).filter(Boolean).sort();
}

function isValueEqual(left: FilterValue, right: FilterValue) {
  if (Array.isArray(left) || Array.isArray(right)) {
    const normalizedLeft = normalizeArrayValue(Array.isArray(left) ? left : []);
    const normalizedRight = normalizeArrayValue(Array.isArray(right) ? right : []);
    if (normalizedLeft.length !== normalizedRight.length) return false;
    return normalizedLeft.every((item, index) => item === normalizedRight[index]);
  }
  return normalizeSingleValue(left) === normalizeSingleValue(right);
}

function resolveBaselineValue(
  field: FilterFieldConfig,
  baseline: FilterState | undefined,
): FilterValue {
  if (baseline && Object.prototype.hasOwnProperty.call(baseline, field.id)) {
    return baseline[field.id] ?? "";
  }
  if (Object.prototype.hasOwnProperty.call(field, "defaultValue")) {
    return field.defaultValue ?? "";
  }
  return field.type === "multi-select" ? [] : "";
}

function isFieldActive(
  field: FilterFieldConfig,
  value: FilterState,
  baseline?: FilterState,
) {
  return !isValueEqual(value[field.id] ?? "", resolveBaselineValue(field, baseline));
}

export const hasActiveFilters = (
  fields: FilterFieldConfig[],
  value: FilterState,
  baseline?: FilterState,
) =>
  fields.some((field) => isFieldActive(field, value, baseline));

export const countActiveFilters = (
  fields: FilterFieldConfig[],
  value: FilterState,
  baseline?: FilterState,
) =>
  fields.reduce((acc, field) => {
    if (!isFieldActive(field, value, baseline)) {
      return acc;
    }
    const current = value[field.id];
    if (field.type === "multi-select" && Array.isArray(current)) {
      return acc + current.length;
    }
    return acc + 1;
  }, 0);
  
export const createInitialFilterState = (
  fields: FilterFieldConfig[],
): FilterState =>
  Object.fromEntries(
    fields.map((field) => [
      field.id,
      field.defaultValue ?? (field.type === "multi-select" ? [] : ""),
    ]),
  );
  
export const getActiveFilterChips = (
  fields: FilterFieldConfig[],
  value: FilterState,
  baseline?: FilterState,
): ActiveFilterChip[] => {
  const chips: ActiveFilterChip[] = [];
  
    for (const field of fields) {
      const currentValue = value[field.id];
  
      if (field.type === "multi-select" && Array.isArray(currentValue)) {
        if (!isFieldActive(field, value, baseline)) {
          continue;
        }
        currentValue.forEach((selectedValue) => {
          const matchedOption = field.options.find(
            (option) => option.value === selectedValue,
          );
  
          chips.push({
            key: `${field.id}:${selectedValue}`,
            fieldId: field.id,
            label: field.label,
            value: matchedOption?.label ?? selectedValue,
            removableValue: selectedValue,
          });
        });
      }

      if (
        field.type === "select" &&
        typeof currentValue === "string" &&
        currentValue.trim() &&
        isFieldActive(field, value, baseline)
      ) {
        const matchedOption = field.options.find(
          (option) => option.value === currentValue,
        );

        chips.push({
          key: field.id,
          fieldId: field.id,
          label: field.label,
          value: matchedOption?.label ?? currentValue,
        });
      }

      if (
        field.type === "datetime-local" &&
        typeof currentValue === "string" &&
        currentValue.trim() &&
        isFieldActive(field, value, baseline)
      ) {
        chips.push({
          key: field.id,
          fieldId: field.id,
          label: field.label,
          value: currentValue,
        });
      }

      if (
        (field.type === "text" || field.type === "search") &&
        typeof currentValue === "string" &&
        currentValue.trim() &&
        isFieldActive(field, value, baseline)
      ) {
        chips.push({
          key: field.id,
          fieldId: field.id,
          label: field.label ?? "Búsqueda",
          value: currentValue,
        });
      }
    }
  
    return chips;
  };
