import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";
import type { AccessStatus } from "./composer.types";

interface AccessStatusFieldProps {
  value?: AccessStatus;
  label?: string;
  onChange: (status: AccessStatus) => void;
}

const STATUS_OPTIONS: Array<{ value: AccessStatus; label: string }> = [
  { value: "ALL", label: "Ambos" },
  { value: "SUCCESS", label: "Exitoso" },
  { value: "FAILED", label: "Fallido" },
];

export function AccessStatusField({ value, label, onChange }: AccessStatusFieldProps) {
  const options = STATUS_OPTIONS.map((option) => ({ ...option, value: option.value }));

  return (
    <div className="flex flex-col gap-1">
      {label ? <span className="text-xs font-medium text-muted-foreground">{label}</span> : null}
      <Combobox
        items={options}
        value={options.find((option) => option.value === value) ?? null}
        onValueChange={(next) => {
          if (next?.value) onChange(next.value);
        }}
        itemToStringLabel={(item) => item.label}
      >
        <ComboboxTrigger className="w-full">
          <ComboboxValue placeholder="Accesos" />
        </ComboboxTrigger>
        <ComboboxContent>
          <ComboboxList>
            <ComboboxCollection>
              {(option) => <ComboboxItem value={option}>{option.label}</ComboboxItem>}
            </ComboboxCollection>
            <ComboboxEmpty>Sin opciones.</ComboboxEmpty>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
