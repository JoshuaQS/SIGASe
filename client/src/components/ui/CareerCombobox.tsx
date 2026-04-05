import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

const CAREERS = [
  "Ingeniería en Sistemas Computacionales",
  "Ingeniería Industrial",
  "Ingeniería en Gestión Empresarial",
  "Ingeniería Mecatrónica",
  "Ingeniería en Tecnologías de la Información",
  "Ingeniería Civil",
  "Administración de Empresas",
  "Contaduría Pública",
  "Licenciatura en Enfermería",
  "Ingeniería Química",
  "Ingeniería Ambiental",
  "Licenciatura en Derecho",
];

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function CareerCombobox({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = CAREERS.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal text-left h-9 truncate"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || "Busca una carrera..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-2" align="start">
        <Input
          placeholder="Buscar carrera..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2 h-8 text-sm"
          autoFocus
        />
        <ScrollArea className="max-h-52">
          {filtered.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Sin resultados
            </p>
          ) : (
            filtered.map((career) => (
              <button
                key={career}
                type="button"
                onClick={() => {
                  onChange(career);
                  setOpen(false);
                  setSearch("");
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                  value === career && "bg-accent text-accent-foreground font-medium"
                )}
              >
                <Check
                  className={cn(
                    "h-4 w-4 shrink-0 text-primary",
                    value === career ? "opacity-100" : "opacity-0"
                  )}
                />
                {career}
              </button>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
