import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { STUDENT_OPTIONS } from "./composer.config";

interface StudentLookupFieldProps {
  query: string;
  selectedId?: string;
  label?: string;
  onChange: (value: { query: string; selectedId?: string }) => void;
}

export function StudentLookupField({ query, selectedId, label, onChange }: StudentLookupFieldProps) {
  const [focused, setFocused] = useState(false);
  const selectedStudent = useMemo(
    () => STUDENT_OPTIONS.find((student) => student.id === selectedId),
    [selectedId]
  );

  const filtered = useMemo(
    () =>
      STUDENT_OPTIONS.filter((student) =>
        student.name.toLowerCase().includes(query.toLowerCase())
      ),
    [query]
  );

  return (
    <div className="relative flex flex-col gap-1">
      {label ? <span className="text-xs font-medium text-muted-foreground">{label}</span> : null}
      {selectedStudent ? (
        <div className="relative">
          <Input
            readOnly
            size="lg"
            variant="protected"
            value={selectedStudent.name}
            className="pr-12"
          />
          <button
            type="button"
            onClick={() => onChange({ query: "" })}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <Input
          type="text"
          value={query}
          size="lg"
          placeholder="Buscar (nombre o matrícula)"
          startAdornment={<Search className="h-4 w-4 text-muted-foreground" />}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 100)}
          onChange={(event) => onChange({ query: event.target.value })}
        />
      )}

      {focused && !selectedStudent && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-border bg-popover p-1 shadow-md">
          {filtered.length > 0 ? (
            filtered.map((student) => (
              <button
                key={student.id}
                type="button"
                className="w-full rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                onMouseDown={() => onChange({ query: student.name, selectedId: student.id })}
              >
                {student.name}
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
