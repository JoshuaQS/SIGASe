import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthSession } from '@//hooks/use-auth-user';

export function SessionGuard() {
  const { user, isInitializing, isSessionValidated } = useAuthSession();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background px-6 py-10">
        <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-8 text-center shadow-sm">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-muted border-t-foreground" aria-hidden />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Validando sesión</p>
            <p className="text-sm text-muted-foreground">Espera un momento…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isSessionValidated || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
