import { Navigate, Outlet } from 'react-router-dom';
import { useAuthSession } from '@/features/auth/hooks/use-auth-user';
import { isAdminRole } from '@/features/auth/types/auth-user';

export function GuestGuard() {
  const { user, isSessionValidated, isInitializing } = useAuthSession();

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

  if (isSessionValidated && user) {
    if (isAdminRole(user.role)) {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/student/portal" replace />;
  }

  return <Outlet />;
}
