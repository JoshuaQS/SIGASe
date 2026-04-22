const fields = [
  { name: "Nombres", required: true },
  { name: "Apellido paterno", required: true },
  { name: "Apellido materno", required: false },
  { name: "Sexo", required: true },
  { name: "Matricula", required: true },
  { name: "Cuatrimestre", required: true },
  { name: "Carrera", required: true },
];

interface Props {
  variant?: "default" | "dark" | "minimal" | "ghost" | "outlined";
  className?: string;
}

export const MiniTemplate = ({ variant = "default", className = "" }: Props) => {
  const styles: Record<string, { wrap: string; row: string; req: string; opt: string }> = {
    default: {
      wrap: "bg-muted/40 border border-border rounded-lg",
      row: "border-border",
      req: "bg-primary text-primary-foreground",
      opt: "bg-secondary text-secondary-foreground",
    },
    dark: {
      wrap: "bg-foreground text-background rounded-lg",
      row: "border-background/10",
      req: "bg-background text-foreground",
      opt: "bg-background/20 text-background/80",
    },
    minimal: {
      wrap: "bg-transparent border-0",
      row: "border-border/60",
      req: "bg-primary/15 text-primary",
      opt: "bg-muted text-muted-foreground",
    },
    ghost: {
      wrap: "bg-card/50 backdrop-blur-sm border border-border/40 rounded-xl",
      row: "border-border/30",
      req: "bg-primary/20 text-primary",
      opt: "bg-muted/60 text-muted-foreground",
    },
    outlined: {
      wrap: "bg-card border-2 border-foreground/15 rounded-md",
      row: "border-foreground/10",
      req: "bg-foreground text-background",
      opt: "border border-foreground/20 text-foreground/70",
    },
  };
  const s = styles[variant];

  return (
    <div className={`${s.wrap} p-3 ${className}`}>
      <p className="text-[10px] font-semibold tracking-wider uppercase opacity-70 mb-2">Plantilla XLSX</p>
      <ul className="space-y-1">
        {fields.map((f) => (
          <li
            key={f.name}
            className={`flex items-center justify-between text-xs py-1.5 border-b last:border-0 ${s.row}`}
          >
            <span className="font-mono">{f.name}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${f.required ? s.req : s.opt}`}>
              {f.required ? "REQ" : "OPC"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
