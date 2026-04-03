import { Outlet } from 'react-router-dom';

import { TooltipProvider } from '@/components/ui/tooltip';
import { useTheme } from '@/hooks/use-theme';
import { BubbleBackground } from '@/modules/student/components/layout/BubbleBackground';
import PortalTopBar from '@/modules/student/components/layout/portal-top-bar';
export default function StudentLayout() {
  const { isDark } = useTheme();

  return (
    <TooltipProvider delayDuration={0}>
      <div className="relative flex h-screen flex-col overflow-hidden bg-background">
        <BubbleBackground
          className="pointer-events-none z-0 bg-gradient-to-br from-[hsl(var(--background))] via-emerald-200 to-green-300 opacity-60 dark:from-emerald-950 dark:via-slate-950 dark:to-teal-950 dark:opacity-72"
          colors={
            isDark
              ? {
                  first: '16,185,129',
                  second: '45,212,191',
                  third: '34,197,94',
                  fourth: '20,184,166',
                  fifth: '74,222,128',
                  sixth: '6,95,70',
                }
              : {
                  first: '74,222,128',
                  second: '52,211,153',
                  third: '45,212,191',
                  fourth: '110,231,183',
                  fifth: '34,197,94',
                  sixth: '16,185,129',
                }
          }
        />
        {/* Encabezado encapsulado */}
        <PortalTopBar />

        {/* Contenido Principal */}
        <main className="relative z-10 min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1800px] p-6 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
