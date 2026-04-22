import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, User } from 'lucide-react';

import { authSession } from '@/features/auth/store/auth-session-store';
import { useAuthSession } from '@/features/auth/hooks/use-auth-user';
import { AdminProfileModal } from '@/features/admins/components/modals/admin-profile-modal';
import { useAppToast } from '@/shared/components/ui/app-toast-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { AppConfirmDialog } from '@/shared/components/ui/confirmation-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

export function AdminProfileMenu() {
  const { user, isInitializing } = useAuthSession();
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState<'profile' | 'alertas'>('profile');
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    if (user?.role.startsWith('ROLE_ADMIN') && user.hasChangedTemporaryPassword === false) {
      setProfileOpen(true);
    }
  }, [user]);

  const displayName = user?.displayName || 'Administrador UTEZ';
  const email = user?.email || 'admin@utez.edu.mx';
  const name = displayName.trim() || email;
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || email[0]?.toUpperCase() || 'A';

  const handleLogout = async () => {
    if (logoutLoading) return;
    setLogoutLoading(true);
    try {
      await authSession.logout();
      setLogoutConfirmOpen(false);
      showToast({
        severity: 'success',
        title: 'Sesión cerrada',
        description: 'Tu sesión administrativa ha finalizado.',
      });
      navigate('/login?mode=admin', { replace: true, state: { mode: 'admin' } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cerrar la sesión.';
      showToast({
        severity: 'error',
        title: 'Error al cerrar sesión',
        description: message,
      });
    } finally {
      setLogoutLoading(false);
    }
  };

  if (isInitializing && !user) {
    return <div className="h-7 w-7 animate-pulse rounded-full bg-muted" />;
  }

  return (
    <>
      <AppConfirmDialog
        open={logoutConfirmOpen}
        title="Cerrar sesión"
        description="Se cerrará tu sesión administrativa actual. ¿Deseas continuar?"
        confirmText="Cerrar sesión"
        cancelText="Cancelar"
        confirmColor="warning"
        isConfirming={logoutLoading}
        onCancel={() => !logoutLoading && setLogoutConfirmOpen(false)}
        onConfirm={() => { if (!logoutLoading) void handleLogout(); }}
      />

      <AdminProfileModal
        open={profileOpen}
        initialTab={profileInitialTab}
        onClose={() => {
          setProfileOpen(false);
          setProfileInitialTab('profile');
        }}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-full p-0.5 pr-2 outline-none transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Abrir menú de perfil"
          >
            <Avatar className="h-7 w-7">
              <AvatarImage alt={displayName} />
              <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden max-w-[120px] truncate text-sm font-medium text-foreground sm:block">
              {name}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="pb-1.5">
            <p className="truncate text-sm font-semibold text-foreground">{name}</p>
            <p className="mt-0.5 truncate text-xs font-normal text-muted-foreground">{email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() => {
              setProfileInitialTab('profile');
              setProfileOpen(true);
            }}
          >
            <User className="h-4 w-4" />
            Ver perfil
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() => {
              setProfileInitialTab('alertas');
              setProfileOpen(true);
            }}
          >
            <Settings className="h-4 w-4" />
            Configuraciones
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            className="cursor-pointer"
            disabled={logoutLoading}
            onSelect={() => setLogoutConfirmOpen(true)}
          >
            <LogOut className="h-4 w-4" />
            {logoutLoading ? 'Cerrando sesión...' : 'Cerrar sesión'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
