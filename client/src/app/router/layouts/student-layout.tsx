import { Outlet } from 'react-router-dom';

import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { AmbientAuthBackground } from '@/features/auth/components/ambient-auth-background';
import PortalTopBar from '@/features/student-portal/components/layout/portal-top-bar';
export default function StudentLayout() {
  return (
    <TooltipProvider delayDuration={0}>
      <div className="relative flex h-screen flex-col overflow-hidden bg-background">
        <AmbientAuthBackground />
        {/* Encabezado encapsulado */}
        <PortalTopBar />

        {/* Contenido Principal */}
        <main className="relative z-10 min-h-0 flex-1 overflow-hidden">
          <div className="mx-auto h-full max-w-[1800px] p-4 md:p-5">
            <Outlet />
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
