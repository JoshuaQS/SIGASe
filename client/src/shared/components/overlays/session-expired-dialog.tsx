'use client';

import { useEffect } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Info, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useSessionExpiredDialog } from '@/shared/hooks/use-session-expired-dialog';

/**
 * Componente que muestra un diálogo cuando la sesión expira.
 * Se cierra automáticamente después de 4 segundos o al hacer click en la X.
 */
export function SessionExpiredDialog() {
  const { open, onClose } = useSessionExpiredDialog();

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [open, onClose]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
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
              <div className="mb-2 grid h-[52px] w-[52px] place-items-center rounded-[14px] border border-info/35 bg-info/15 text-info">
                <Info className="h-6 w-6" strokeWidth={1.8} />
              </div>

              <DialogPrimitive.Title className="mb-[6px] text-[1.125rem] leading-[1.35] font-bold tracking-[-0.015em] text-foreground">
                Sesión Expirada
              </DialogPrimitive.Title>

              <DialogPrimitive.Description className="max-w-[320px] whitespace-pre-line text-sm leading-[1.55] text-muted-foreground">
                Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente para continuar.
              </DialogPrimitive.Description>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
