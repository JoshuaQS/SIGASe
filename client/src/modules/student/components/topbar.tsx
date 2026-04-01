import type { ReactNode } from 'react';

import { cn } from '@//lib/utils';

type PortalTopBarProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Barra superior del portal (estudiantes): fondo primary, contenido alineado a la derecha.
 * Pasa los botones como `children` (tema, perfil, cerrar sesión, etc.).
 */
export function PortalTopBar({ children, className }: PortalTopBarProps) {
  return (
    <nav
      aria-label="Acciones del portal"
      className={cn(
        'absolute inset-x-0 top-0 z-20 flex h-14 items-center justify-end gap-0.5 bg-primary px-4 shadow-sm sm:gap-1 sm:px-6',
        className,
      )}
    >
      {children}
    </nav>
  );
}
