import { Outlet } from 'react-router-dom';

import { AmbientAuthBackground } from '@/modules/auth/components/ambient-auth-background';

export default function StudentLayout() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <AmbientAuthBackground />
      <Outlet />
    </main>
  );
}
