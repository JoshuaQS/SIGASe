import { useEffect } from 'react';
import AppRouter from '@/app/router';
import { authSession } from '@/features/auth/store/auth-session-store';
import { AppToastProvider } from '@/shared/components/ui/app-toast-provider';
import { SessionExpiredDialog } from '@/shared/components/overlays/session-expired-dialog';

export default function App() {
  useEffect(() => {
    void authSession.initializeAuth();
  }, []);

  return (
    <AppToastProvider>
      <SessionExpiredDialog />
      <AppRouter />
    </AppToastProvider>
  );
}
