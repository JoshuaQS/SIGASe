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
  ): FilterState => ({
    ...state,
    [key]: "",
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
  
  export const hasActiveFilters = (value: FilterState) =>
    Object.values(value).some((item) => {
      if (Array.isArray(item)) return item.length > 0;
      return Boolean(item && String(item).trim());
    });
  
  export const countActiveFilters = (value: FilterState) =>
    Object.values(value).reduce((acc, item) => {
      if (Array.isArray(item)) return acc + item.length;
      return item && String(item).trim() ? acc + 1 : acc;
    }, 0);
  
export const createInitialFilterState = (
  fields: FilterFieldConfig[],
): FilterState =>
  Object.fromEntries(
    fields.map((field) => [
      field.id,
      field.type === "multi-select" ? [] : "",
    ]),
  );
  
  export const getActiveFilterChips = (
    fields: FilterFieldConfig[],
    value: FilterState,
  ): ActiveFilterChip[] => {
    const chips: ActiveFilterChip[] = [];
  
    for (const field of fields) {
      const currentValue = value[field.id];
  
      if (field.type === "multi-select" && Array.isArray(currentValue)) {
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
        currentValue.trim()
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
        currentValue.trim()
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
        currentValue.trim()
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
