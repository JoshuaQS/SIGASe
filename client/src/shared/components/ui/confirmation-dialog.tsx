import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  ShieldAlert,
  X,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

type ConfirmTone = "primary" | "error" | "success" | "warning" | "info";
type DialogSize = "sm" | "md" | "lg";
type InitialFocusTarget = "cancel" | "confirm";

interface AppConfirmDialogProps {
  open: boolean;
  title: React.ReactNode;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: ConfirmTone;
  size?: DialogSize;
  isConfirming?: boolean;
  animateIcon?: boolean;
  preventOutsideClose?: boolean;
  preventEscapeClose?: boolean;
  initialFocus?: InitialFocusTarget;
  footer?: React.ReactNode;
  confirmButtonProps?: Omit<
    React.ComponentProps<typeof Button>,
    "onClick" | "children"
  >;
  cancelButtonProps?: Omit<
    React.ComponentProps<typeof Button>,
    "onClick" | "children"
  >;
  onCancel: () => void;
  onConfirm: () => void;
}

const ICON_WRAP: Record<ConfirmTone, string> = {
  primary: "border-primary/25 bg-primary/10 text-primary",
  success: "border-success/25 bg-success/10 text-success",
  error: "border-destructive/25 bg-destructive/10 text-destructive",
  warning: "border-warning/25 bg-warning/10 text-warning",
  info: "border-info/25 bg-info/10 text-info",
};

const ICON_GLOW: Record<ConfirmTone, string> = {
  primary: "shadow-[0_0_24px_-4px_hsl(var(--primary)/0.35)]",
  success: "shadow-[0_0_24px_-4px_hsl(var(--success)/0.35)]",
  error: "shadow-[0_0_24px_-4px_hsl(var(--destructive)/0.35)]",
  warning: "shadow-[0_0_24px_-4px_hsl(var(--warning)/0.35)]",
  info: "shadow-[0_0_24px_-4px_hsl(var(--info)/0.35)]",
};

const TONE_RING: Record<ConfirmTone, string> = {
  primary: "ring-primary/20",
  success: "ring-success/20",
  error: "ring-destructive/20",
  warning: "ring-warning/20",
  info: "ring-info/20",
};

const SIZE_CLASS: Record<DialogSize, string> = {
  sm: "max-w-[380px]",
  md: "max-w-[420px]",
  lg: "max-w-[520px]",
};

function confirmButtonClass(tone: ConfirmTone): string {
  const base = "h-[42px] flex-1 rounded-lg text-sm font-semibold transition-all";
  switch (tone) {
    case "success":
      return cn(base, "bg-success text-success-foreground hover:bg-success/90");
    case "error":
      return cn(
        base,
        "bg-destructive text-destructive-foreground hover:bg-destructive/90"
      );
    case "warning":
      return cn(base, "bg-warning text-warning-foreground hover:bg-warning/90");
    case "info":
      return cn(base, "bg-info text-info-foreground hover:bg-info/90");
    default:
      return cn(base, "bg-primary text-primary-foreground hover:bg-primary/90");
  }
}

function DialogIcon({ variant }: { variant: ConfirmTone }) {
  const props = { className: "h-7 w-7", strokeWidth: 1.6 };

  switch (variant) {
    case "success":
      return <CheckCircle2 {...props} />;
    case "error":
      return <ShieldAlert {...props} />;
    case "warning":
      return <AlertTriangle {...props} />;
    case "info":
      return <Info {...props} />;
    default:
      return <HelpCircle {...props} />;
  }
}

export function AppConfirmDialog({
  open,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  confirmColor = "primary",
  size = "md",
  isConfirming = false,
  animateIcon = false,
  preventOutsideClose = false,
  preventEscapeClose = false,
  initialFocus = "cancel",
  footer,
  confirmButtonProps,
  cancelButtonProps,
  onCancel,
  onConfirm,
}: AppConfirmDialogProps) {
  const cancelRef = React.useRef<HTMLButtonElement | null>(null);
  const confirmRef = React.useRef<HTMLButtonElement | null>(null);

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isConfirming) onCancel();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-background/60 backdrop-blur-[6px]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=open]:duration-[260ms] data-[state=closed]:duration-[150ms]"
          )}
        />

        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[81] w-[92vw] -translate-x-1/2 -translate-y-1/2",
            "overflow-hidden rounded-2xl border border-border/40 bg-card/95 p-0 text-card-foreground backdrop-blur-xl",
            SIZE_CLASS[size],
            `shadow-2xl ring-1 ${TONE_RING[confirmColor]}`,
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
            "data-[state=open]:duration-[260ms] data-[state=closed]:duration-[150ms]"
          )}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            const target =
              initialFocus === "confirm" ? confirmRef.current : cancelRef.current;
            target?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (isConfirming || preventEscapeClose) {
              event.preventDefault();
            }
          }}
          onPointerDownOutside={(event) => {
            if (isConfirming || preventOutsideClose) {
              event.preventDefault();
            }
          }}
          onInteractOutside={(event) => {
            if (isConfirming || preventOutsideClose) {
              event.preventDefault();
            }
          }}
        >
          <div className="relative px-6 pb-6 pt-8">
            {!isConfirming && (
              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  aria-label="Cerrar"
                  className="absolute right-3 top-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:bg-muted/30 hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </DialogPrimitive.Close>
            )}

            <div className="flex flex-col items-center text-center">
              <div
                className={cn(
                  "mb-4 grid h-16 w-16 place-items-center rounded-2xl border-2",
                  ICON_WRAP[confirmColor],
                  ICON_GLOW[confirmColor],
                  animateIcon &&
                    open &&
                    "animate-[iconPulse_1.8s_ease-in-out_infinite]"
                )}
              >
                <DialogIcon variant={confirmColor} />
              </div>

              <DialogPrimitive.Title className="mb-1.5 text-lg font-bold leading-tight tracking-[-0.015em] text-foreground">
                {title}
              </DialogPrimitive.Title>

              <DialogPrimitive.Description asChild>
                <div className="max-w-[300px] whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {description}
                </div>
              </DialogPrimitive.Description>
            </div>

            {footer ? (
              <div className="mt-6">{footer}</div>
            ) : (
              <div className="mt-6 flex gap-2.5">
                <Button
                  ref={cancelRef}
                  onClick={onCancel}
                  variant="outline"
                  disabled={isConfirming}
                  className={cn(
                    "h-[42px] flex-1 rounded-lg border border-border/50 bg-transparent text-sm font-semibold text-foreground",
                    "hover:bg-muted/30"
                  )}
                  {...cancelButtonProps}
                >
                  {cancelText}
                </Button>

                <Button
                  ref={confirmRef}
                  onClick={onConfirm}
                  className={cn(
                    confirmButtonClass(confirmColor),
                    isConfirming && "cursor-not-allowed opacity-60"
                  )}
                  isLoading={isConfirming}
                  disabled={isConfirming}
                  {...confirmButtonProps}
                >
                  {confirmText}
                </Button>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}