import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@//lib/utils";
import { Label } from "@/components/ui/label";
import { FieldMessage } from "@/components/ui/forms/field-message";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface FormFieldProps {
  label: string;
  hint?: string;
  error?: string;
  success?: string;
  required?: boolean;
  icon?: LucideIcon;
  htmlFor?: string;
  className?: string;
  reserveMessageSpace?: boolean;
  children: React.ReactNode;
}

/**
 * Contenedor estándar para campos de formulario.
 * Centraliza el diseño de Labels, Mensajes de error/ayuda y Accesibilidad (ARIA).
 */
export function FormField({
  label,
  hint,
  error,
  success,
  required,
  icon: Icon,
  htmlFor,
  className,
  reserveMessageSpace = true,
  children,
}: FormFieldProps) {
  // Generamos un ID base para los mensajes si no existe htmlFor
  const baseId = htmlFor ?? `field-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label htmlFor={htmlFor} className="inline-flex items-center gap-2 px-0.5">
          {Icon ? (
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
            </span>
          ) : null}

          <span className="text-sm font-semibold tracking-tight">
            {label}
            {required ? <span className="ml-1 text-destructive" aria-hidden="true">*</span> : null}
          </span>
        </Label>
      )}

      <div className="relative">
        {children}
      </div>

      {(reserveMessageSpace || error || success || hint) ? (
        <div className={cn("transition-all", reserveMessageSpace ? "min-h-[1.25rem]" : "min-h-0")}>
          {error ? (
            <FieldMessage
              id={`${baseId}-error`}
              variant="error"
              icon={AlertCircle}
              className="animate-in fade-in slide-in-from-top-0.5"
              role="alert"
            >
              {error}
            </FieldMessage>
          ) : success ? (
            <FieldMessage
              id={`${baseId}-success`}
              variant="success"
              icon={CheckCircle2}
              className="animate-in fade-in"
            >
              {success}
            </FieldMessage>
          ) : hint ? (
            <FieldMessage
              id={`${baseId}-hint`}
              variant="hint"
              className="text-[11px] leading-tight text-muted-foreground/70"
            >
              {hint}
            </FieldMessage>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
