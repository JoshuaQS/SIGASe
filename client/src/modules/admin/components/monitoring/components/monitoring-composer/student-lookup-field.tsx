import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { listStudents, type StudentResponseDto } from "@/lib/api/students-api";
import { cn } from "@/lib/utils";
import { getFormControlSize } from "@/components/ui/forms/form-control-styles";

const FIELD_SIZE: "md" = "md";
const cfg = getFormControlSize(FIELD_SIZE);

interface StudentLookupFieldProps {
  query: string;
  selectedId?: string;
  label?: string;
  onChange: (value: { query: string; selectedId?: string }) => void;
}

export function StudentLookupField({ query, selectedId, label, onChange }: StudentLookupFieldProps) {
  const [focused, setFocused] = useState(false);
  const [options, setOptions] = useState<StudentResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const safeQuery = query.trim();
    if (!safeQuery || selectedId) {
      setOptions([]);
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    let canceled = false;
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await listStudents({
          query: safeQuery,
          page: 0,
          size: 8,
          sortBy: "name",
          sortDir: "asc",
        });
        if (canceled) return;
        setOptions(response.content);
      } catch {
        if (canceled) return;
        setLoadError("No se pudieron cargar estudiantes.");
        setOptions([]);
      } finally {
        if (!canceled) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      canceled = true;
      window.clearTimeout(timeoutId);
    };
  }, [query, selectedId]);

  const fullName = (student: StudentResponseDto) =>
    [student.name, student.lastNamePaternal, student.lastNameMaternal]
      .filter(Boolean)
      .join(" ")
      .trim();

  const selectedStudent = useMemo(
    () => options.find((student) => student.id === selectedId),
    [options, selectedId]
  );

  const filtered = useMemo(
    () => options,
    [options]
  );

  return (
    <div className="relative flex flex-col gap-1">
      {label ? <span className={cfg.fieldLabel}>{label}</span> : null}
      {selectedStudent ? (
        <div className="relative">
          <Input
            readOnly
            size={FIELD_SIZE}
            variant="protected"
            value={selectedStudent ? fullName(selectedStudent) : query}
            className="pr-12"
          />
          <button
            type="button"
            onClick={() => onChange({ query: "" })}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className={cfg.icon} />
          </button>
        </div>
      ) : (
        <Input
          type="text"
          value={query}
          size={FIELD_SIZE}
          placeholder="Buscar (nombre o matrícula)"
          startAdornment={<Search className={cn("text-muted-foreground", cfg.icon)} />}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 100)}
          onChange={(event) => onChange({ query: event.target.value })}
        />
      )}

      {focused && !selectedStudent && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-border bg-popover p-1 shadow-md">
          {isLoading ? (
            <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
              <Loader2 className={cn("animate-spin", cfg.icon)} />
              Buscando estudiantes...
            </div>
          ) : loadError ? (
            <p className="px-2 py-2 text-xs text-destructive">{loadError}</p>
          ) : filtered.length > 0 ? (
            filtered.map((student) => (
              <button
                key={student.id}
                type="button"
                className="w-full rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                onMouseDown={() => onChange({ query: fullName(student), selectedId: student.id })}
              >
                <div className="font-medium">{fullName(student)}</div>
                <div className="text-xs text-muted-foreground">{student.enrollmentId}</div>
              </button>
            ))
          ) : (
            <p className="px-2 py-2 text-xs text-muted-foreground">Sin coincidencias.</p>
          )}
        </div>
      )}
    </div>
  );
}
