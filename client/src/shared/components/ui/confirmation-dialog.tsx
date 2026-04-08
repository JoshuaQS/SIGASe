'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { AlertTriangle, HelpCircle, Info, ShieldAlert, X } from 'lucide-react';

interface AppConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'error' | 'success' | 'warning' | 'info';
  onCancel: () => void;
  onConfirm: () => void;
}

type ConfirmTone = NonNullable<AppConfirmDialogProps['confirmColor']>;

const ICON_WRAP: Record<ConfirmTone, string> = {
  primary: 'border-primary/35 bg-primary/15 text-primary',
  success: 'border-success/35 bg-success/15 text-success',
  error: 'border-destructive/35 bg-destructive/15 text-destructive',
  warning: 'border-warning/35 bg-warning/15 text-warning',
  info: 'border-info/35 bg-info/15 text-info',
};

function confirmButtonClass(tone: ConfirmTone): string {
  const base = 'h-[42px] flex-1 rounded-lg text-sm font-semibold';
  switch (tone) {
    case 'success':
      return cn(base, 'bg-success text-success-foreground hover:bg-success/90');
    case 'error':
      return cn(base, 'bg-destructive text-destructive-foreground hover:bg-destructive/90');
    case 'warning':
      return cn(base, 'bg-warning text-warning-foreground hover:bg-warning/90');
    case 'info':
      return cn(base, 'bg-info text-info-foreground hover:bg-info/90');
    default:
      return cn(base, 'bg-primary text-primary-foreground hover:bg-primary/90');
  }
}

function DialogIcon({ variant }: { variant: ConfirmTone }) {
  const props = { className: 'h-6 w-6', strokeWidth: 1.8 };
  switch (variant) {
    case 'error':
      return <ShieldAlert {...props} />;
    case 'warning':
      return <AlertTriangle {...props} />;
    case 'info':
      return <Info {...props} />;
    default:
      return <HelpCircle {...props} />;
  }
}

export function AppConfirmDialog({
  open,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmColor = 'primary',
  onCancel,
  onConfirm,
}: AppConfirmDialogProps) {
  const tone: ConfirmTone = confirmColor ?? 'primary';

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-[hsl(var(--shadow-color)/0.42)] backdrop-blur-[4px]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
            'data-[state=open]:duration-[260ms] data-[state=closed]:duration-[150ms]',
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-[81] w-[92vw] max-w-[420px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[20px] border border-border bg-card p-0 text-card-foreground',
            'shadow-xl ring-1 ring-border/60',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
            'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
            'data-[state=open]:duration-[260ms] data-[state=closed]:duration-[150ms]',
          )}
        >
          <div className="relative px-[24px] pb-[24px] pt-[28px]">
            <DialogPrimitive.Close
              aria-label="Cerrar"
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>

            <div className="flex flex-col items-center text-center">
              <div
                className={cn(
                  'mb-2 grid h-[52px] w-[52px] place-items-center rounded-[14px] border',
                  ICON_WRAP[tone],
                  open && 'animate-[iconPulse_1.8s_ease-in-out_infinite]',
                )}
              >
                <DialogIcon variant={tone} />
              </div>

              <DialogPrimitive.Title
                className="mb-[6px] text-[1.125rem] leading-[1.35] font-bold tracking-[-0.015em] text-foreground"
              >
                {title}
              </DialogPrimitive.Title>

              <DialogPrimitive.Description className="max-w-[320px] whitespace-pre-line text-sm leading-[1.55] text-muted-foreground">
                {description}
              </DialogPrimitive.Description>
            </div>

            <div className="mt-[24px] flex gap-[10px]">
              <Button
                onClick={onCancel}
                variant="outline"
                className="h-[42px] flex-1 rounded-lg border border-border bg-transparent text-sm font-semibold text-foreground hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                {cancelText}
              </Button>

              <Button onClick={onConfirm} className={confirmButtonClass(tone)}>
                {confirmText}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
