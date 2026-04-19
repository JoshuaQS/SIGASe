import type { ReactNode } from 'react';

import { Badge } from '@/shared/components/ui/badge';
import { useTheme } from '@/shared/hooks/use-theme';
import StudentForceMenu from './student-force-menu';

type PortalTopBarProps = {
  children?: ReactNode;
};

const ForceTopBar = ({ children }: PortalTopBarProps) => {
  const { isDark, mounted } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-topbar/85 shadow-lg shadow-black/5 backdrop-blur supports-[backdrop-filter]:bg-topbar/75">
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-background shadow-lg shadow-black/5">
            <img
              src={mounted && isDark ? '/dark.png' : '/light.png'}
              alt="SIGASe"
              className="h-9 w-9 object-contain"
              width={36}
              height={36}
              decoding="async"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-foreground">Portal estudiantil</span>
              <Badge variant="filled" className="auth-shine-chip h-4">
                SIGASe
                <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
                  <span className="absolute top-[-100%] left-[-100%] h-[300%] w-[50%] rotate-45 animate-chip-shine-diagonal bg-gradient-to-r from-transparent via-primary-foreground/35 to-transparent" />
                </span>
              </Badge>
            </div>
            <p className="mt-1 text-sm leading-none text-muted-foreground">
              Sistema Integral de Gestión y Acceso SSO eLibro
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {children ? (
            <div className="flex items-center gap-2">{children}</div>
          ) : (
            <StudentForceMenu />
          )}
        </div>
      </div>
    </header>
  );
};

export default ForceTopBar;
