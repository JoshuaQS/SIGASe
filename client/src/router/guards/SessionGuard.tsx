import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthSession } from '@//hooks/use-auth-user';
import { authSession } from '@//auth/auth-session-store';

export function SessionGuard() {
  const { user, isInitializing, isSessionValidated, bootstrapError } = useAuthSession();
  const location = useLocation();
  const isOnboardingForcePasswordPath =
    location.pathname === '/student/force-password-change'
    && new URLSearchParams(location.search).has('token');

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

  if (bootstrapError) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background px-6 py-10">
        <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-xl border border-border bg-card px-6 py-8 text-center shadow-sm">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">No se pudo conectar con el servidor</p>
            <p className="text-sm text-muted-foreground">Verifica tu conexión e intenta de nuevo.</p>
          </div>
          <button
            type="button"
            onClick={() => void authSession.initializeAuth()}
            className="text-sm font-medium text-foreground underline underline-offset-4"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if ((!isSessionValidated || !user) && !isOnboardingForcePasswordPath) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
