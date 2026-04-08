import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import type { AccessStatus } from "./composer.types";
import { getFormControlSize } from "@/shared/components/ui/forms/form-control-styles";

const FIELD_SIZE = "md" as const;
const cfg = getFormControlSize(FIELD_SIZE);

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
  return (
    <div className="flex flex-col gap-1">
      {label ? <span className={cfg.fieldLabel}>{label}</span> : null}
      <Select
        value={value ?? ""}
        onValueChange={(next) => onChange(next as AccessStatus)}
      >
        <SelectTrigger className="w-full" size={FIELD_SIZE}>
          <SelectValue placeholder="Selecciona una opción" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
