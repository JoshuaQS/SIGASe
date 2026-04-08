import type { ReactNode } from 'react';
import { BookOpen } from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { ThemeToggle } from '@/shared/components/ui/theme-toggle';
import StudentProfileMenu from './student-profile-menu';

type PortalTopBarProps = {
  children?: ReactNode;
};

export const PortalTopBar = ({ children }: PortalTopBarProps) => {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-topbar shadow-sm">
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
            <BookOpen className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-foreground">Portal estudiantil</span>
              <Badge variant="filled" className="auth-shine-chip">
                SIGASe
                <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
                  <span className="absolute top-[-100%] left-[-100%] h-[300%] w-[50%] rotate-45 animate-chip-shine-diagonal bg-gradient-to-r from-transparent via-primary-foreground/35 to-transparent" />
                </span>
              </Badge>
            </div>
            <p className="mt-1 text-md leading-none text-muted-foreground">
              Sistema Integral de Gestión y Acceso SSO eLibro
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {children ? (
            <div className="flex items-center gap-2">{children}</div>
          ) : (
            <div className="flex items-center gap-2">
              <ThemeToggle className="h-10 w-10" />
              <div className="mx-1 h-6 w-px bg-muted-foreground/50" />
              <StudentProfileMenu />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default PortalTopBar;
