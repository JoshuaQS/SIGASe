import { Outlet } from 'react-router-dom';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { AdminTopbar } from '@/app/router/layouts/admin-topbar';

export default function AdminLayout() {
  return (
    <TooltipProvider delayDuration={0}>
      <div className="h-screen overflow-hidden bg-background flex flex-col">
        {/* Encabezado encapsulado */}
        <AdminTopbar />

        {/* Contenido Principal */}
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="max-w-[1800px] mx-auto p-6 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
