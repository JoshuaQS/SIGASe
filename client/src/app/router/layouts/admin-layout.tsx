import { Outlet, useLocation } from 'react-router-dom';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { AdminTopbar } from '@/app/router/layouts/admin-topbar';

export default function AdminLayout() {
  const location = useLocation();
  const isDesignSystemRoute = location.pathname === '/admin/design-system';

  return (
    <TooltipProvider delayDuration={0}>
      <div className="h-screen overflow-hidden bg-background flex flex-col">
        {!isDesignSystemRoute ? <AdminTopbar /> : null}

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className={isDesignSystemRoute ? 'p-4 md:p-6' : 'max-w-[1800px] mx-auto p-6 md:p-8'}>
            <Outlet />
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
