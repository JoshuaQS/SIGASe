import { Search, Sparkles, Trash2 } from "lucide-react";
import {
  Combobox,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipRemove,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxLabelGroup,
  ComboboxList,
  ComboboxItem,
} from "@/components/ui/combobox";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { CAREER_OPTIONS } from "./composer.config";

interface CareerMultiComboboxFieldProps {
  values: string[];
  onChange: (values: string[]) => void;
}

export function CareerMultiComboboxField({ values, onChange }: CareerMultiComboboxFieldProps) {
  return (
    <Combobox<string, true>
      multiple
      value={values}
      onValueChange={(next) => onChange(Array.isArray(next) ? next : [])}
      items={[...CAREER_OPTIONS]}
      itemToStringLabel={(item) => item}
      itemToStringValue={(item) => item}
    >
      <div className="w-[300px] space-y-1">
        <ComboboxLabel>Carrera(s)</ComboboxLabel>

        <InputGroup className="min-h-10 rounded-lg border border-input bg-background px-2">
          <InputGroupAddon>
            <Search className="h-4 w-4" />
          </InputGroupAddon>
          <ComboboxChips className="flex flex-1 flex-wrap gap-1 py-1">
            {values.map((career) => (
              <ComboboxChip key={career}>
                <span className="max-w-[170px] truncate">{career}</span>
                <ComboboxChipRemove />
              </ComboboxChip>
            ))}
            <ComboboxChipsInput placeholder={values.length ? "Agregar carrera..." : "Buscar carrera..."} />
          </ComboboxChips>
        </InputGroup>
      </div>

      <ComboboxContent>
        <div className="flex items-center gap-2 border-b border-border px-2 pb-2 pt-1">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs"
            onClick={() => onChange([...CAREER_OPTIONS])}
          >
            <Sparkles className="h-3 w-3" />
            Seleccionar todas las carreras
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs"
            onClick={() => onChange([])}
          >
            <Trash2 className="h-3 w-3" />
            Limpiar
          </button>
        </div>

        <ComboboxList>
          <ComboboxGroup>
            <ComboboxLabelGroup className="px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              Carreras
            </ComboboxLabelGroup>
            <ComboboxCollection>
              {(career) => <ComboboxItem value={career}>{career}</ComboboxItem>}
            </ComboboxCollection>
          </ComboboxGroup>
          <ComboboxEmpty>Sin coincidencias.</ComboboxEmpty>
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
