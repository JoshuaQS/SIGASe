import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { listActiveCareers, type CareerDto } from "@/lib/api/careers-api";
import { getFormControlSize } from "@/components/ui/forms/form-control-styles";
import { cn } from "@/lib/utils";

const FIELD_SIZE: "md" = "md";
const cfg = getFormControlSize(FIELD_SIZE);

interface CareerMultiComboboxFieldProps {
  values: string[];
  onChange: (values: string[]) => void;
}

export function CareerMultiComboboxField({ values, onChange }: CareerMultiComboboxFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [careers, setCareers] = useState<CareerDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCareers = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await listActiveCareers();
        if (cancelled) return;
        setCareers(data);
      } catch {
        if (cancelled) return;
        setLoadError("No se pudieron cargar las carreras.");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadCareers();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedByCode = useMemo(() => new Set(values), [values]);
  const visibleCareers = useMemo(() => {
    const safeSearch = search.trim().toLowerCase();
    if (!safeSearch) return careers;

    return careers.filter((career) => {
      const haystack = `${career.code} ${career.name}`.toLowerCase();
      return haystack.includes(safeSearch);
    });
  }, [careers, search]);

  const selectedCount = values.length;
  const allSelected = careers.length > 0 && selectedCount === careers.length;

  const toggleCareer = (careerCode: string) => {
    if (selectedByCode.has(careerCode)) {
      onChange(values.filter((code) => code !== careerCode));
      return;
    }
    onChange([...values, careerCode]);
  };

  const selectedCareerLabels = useMemo(() => {
    const byCode = new Map(careers.map((career) => [career.code, career]));
    return values.map((code) => byCode.get(code)?.name ?? code);
  }, [careers, values]);

  const summaryLabel =
    selectedCount === 0
      ? "Selecciona una o más carreras"
      : selectedCount === 1
        ? selectedCareerLabels[0]
        : `${selectedCount} carreras seleccionadas`;

  const selectAll = () => {
    onChange(careers.map((career) => career.code));
  };

  return (
    <div className="w-[240px] space-y-1">
      <p className={cfg.fieldLabel}>Carrera(s)</p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size={FIELD_SIZE}
            className={cn("w-full justify-between rounded-lg", cfg.control)}
          >
            <span className={cn("truncate text-left", cfg.fieldLabel)}>{summaryLabel}</span>
            <ChevronDown className={cn("text-muted-foreground", cfg.icon)} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start" sideOffset={8}>
          <Command>
            <CommandInput
              placeholder="Buscar carrera por nombre o clave"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                {isLoading ? "Cargando carreras..." : "No hay carreras que coincidan."}
              </CommandEmpty>
              <CommandGroup>
                <CommandItem
                  className="text-muted-foreground"
                  onSelect={() => {
                    if (allSelected) {
                      onChange([]);
                      return;
                    }
                    selectAll();
                  }}
                >
                  <Sparkles className={cfg.icon} />
                  {allSelected ? "Deseleccionar todo" : "Seleccionar todo"}
                </CommandItem>
                {isLoading ? (
                  <CommandItem disabled className="text-muted-foreground">
                    <Loader2 className={cn("animate-spin", cfg.icon)} />
                    Cargando carreras...
                  </CommandItem>
                ) : null}
                {loadError ? (
                  <CommandItem disabled className="text-muted-foreground">
                    {loadError}
                  </CommandItem>
                ) : null}
                {!isLoading && !loadError
                  ? visibleCareers.map((career) => {
                      const checked = selectedByCode.has(career.code);
                      return (
                        <CommandItem
                          key={career.id}
                          value={`${career.code} ${career.name}`}
                          className="text-muted-foreground"
                          onSelect={() => toggleCareer(career.code)}
                        >
                          <span className="min-w-14 text-xs font-semibold text-muted-foreground">
                            {career.code}
                          </span>
                          <span className="truncate text-muted-foreground">{career.name}</span>
                          {checked ? <Check className={cn("ml-auto text-muted-foreground", cfg.icon)} /> : null}
                        </CommandItem>
                      );
                    })
                  : null}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
