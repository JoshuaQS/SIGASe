import { useEffect } from 'react';
import AppRouter from '@/router';
import { authSession } from '@/auth/auth-session-store';
import { AppToastProvider } from '@/components/ui/app-toast-provider';

export default function App() {
  useEffect(() => {
    void authSession.initializeAuth();
  }, []);

  return (
    <AppToastProvider>
      <AppRouter />
    </AppToastProvider>
  );
}
