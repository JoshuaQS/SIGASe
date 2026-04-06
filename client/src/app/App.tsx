import { useEffect } from 'react';
import AppRouter from '@/router';
import { authSession } from '@/auth/auth-session-store';
import { AppToastProvider } from '@/components/ui/app-toast-provider';
import { SessionExpiredDialog } from '@/components/session-expired-dialog';

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
