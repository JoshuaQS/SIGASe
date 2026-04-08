import { Outlet } from 'react-router-dom';

import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { useTheme } from '@/shared/hooks/use-theme';
import { BubbleBackground } from '@/features/student-portal/components/layout/bubble-background';
import PortalTopBar from '@/features/student-portal/components/layout/portal-top-bar';
export default function StudentLayout() {
  const { isDark } = useTheme();

  return (
    <TooltipProvider delayDuration={0}>
      <div className="relative flex h-screen flex-col overflow-hidden bg-background">
        <BubbleBackground
          className="pointer-events-none z-0 bg-gradient-to-br from-[hsl(var(--background))] via-[hsl(var(--background))] to-emerald-100/40 opacity-40 dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950/35 dark:opacity-46"
          colors={
            isDark
              ? {
                first: '16,185,129',
                second: '52,211,153',
                third: '45,212,191',
                fourth: '15,118,110',
                fifth: '74,222,128',
                sixth: '7,89,75',
              }
              : {
                first: '74,222,128',
                second: '110,231,183',
                third: '45,212,191',
                fourth: '167,243,208',
                fifth: '52,211,153',
                sixth: '187,247,208',
              }
          }
        />
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
