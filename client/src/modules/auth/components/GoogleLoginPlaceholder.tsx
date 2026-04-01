import { cn } from "@/lib/utils";

interface GoogleLoginPlaceholderProps {
  label?: string;
  helperText?: string;
  showHelperText?: boolean;
}

/** Misma altura, ancho y radio que el botón Google (login estudiante). */
export const studentAuthFieldClass =
  "h-11 w-full rounded-[4px] border border-input";

export default function GoogleLoginPlaceholder({
  label = "Botón Google aquí",
  helperText = "Validando credencial...",
  showHelperText = false,
}: GoogleLoginPlaceholderProps) {
  return (
    <div className="flex w-full flex-col items-center">
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden bg-card",
          studentAuthFieldClass,
        )}
      >
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>

      {showHelperText ? (
        <p className="mt-3 text-sm text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
}
