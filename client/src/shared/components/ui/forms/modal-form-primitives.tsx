import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/utils";

/** Contenedor estándar de modales del DS (misma base que detalle de alumno). */
export const modalFormShellClass =
    "w-full overflow-hidden rounded-2xl border border-border bg-card shadow-md";

type ModalFormHeaderProps = {
    avatar: ReactNode;
    title: string;
    subtitle?: ReactNode;
    badges?: ReactNode;
    onClose?: () => void;
    className?: string;
    /** Anula el círculo del avatar (p. ej. éxito con anillo verde). */
    avatarRingClassName?: string;
};

/**
 * Cabecera alineada con `StudentDetailModal`: avatar con anillo, título, badges en línea, subtítulo, cerrar.
 */
export function ModalFormHeader({
    avatar,
    title,
    subtitle,
    badges,
    onClose,
    className,
    avatarRingClassName,
}: ModalFormHeaderProps) {
    return (
        <div
            className={cn(
                "flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-5",
                className
            )}
        >
            <div className="flex min-w-0 items-center gap-4">
                <div
                    className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20 text-primary [&_svg]:size-6",
                        avatarRingClassName
                    )}
                >
                    {avatar}
                </div>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-foreground">{title}</h3>
                        {badges}
                    </div>
                    {subtitle ? <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div> : null}
                </div>
            </div>
            {onClose ? (
                <button
                    type="button"
                    onClick={onClose}
                    className="ml-auto shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Cerrar"
                >
                    <X className="h-4 w-4" />
                </button>
            ) : null}
        </div>
    );
}

export function ModalFormFooter({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "flex flex-wrap items-center justify-end gap-2 border-t border-border bg-secondary/30 px-6 py-4",
                className
            )}
        >
            {children}
        </div>
    );
}

export function ModalFormBody({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn("max-h-[min(70vh,520px)] space-y-4 overflow-y-auto px-6 py-5", className)}>{children}</div>
    );
}
