import { Link, useNavigate } from 'react-router-dom';
import {
  CircleUserRound,
  LogOut,
  type LucideIcon,
} from 'lucide-react';

import { authSession } from '@//auth/auth-session-store';
import { useAuthUser } from '@//hooks/use-auth-user';
import { useAppToast } from '@/components/ui/app-toast-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@//lib/utils';

type MenuItem = {
  label: string;
  icon: LucideIcon;
  to: string;
};

const PROFILE_ITEMS: MenuItem[] = [
  { label: 'Mi perfil', icon: CircleUserRound, to: '/admin/monitoreo-reportes' },
];

const itemClass =
  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-popover-foreground transition-colors hover:bg-muted';

export function AdminProfileMenu() {
  const user = useAuthUser();
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const displayName = user?.displayName || 'Administrador UTEZ';
  const email = user?.email || 'admin@utez.edu.mx';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'AU';

  const handleLogout = async () => {
    try {
      await authSession.logout();
      showToast({
        severity: 'success',
        title: 'Sesión cerrada',
        description: 'Tu sesión administrativa ha finalizado.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cerrar la sesión.';
      showToast({
        severity: 'error',
        title: 'Error al cerrar sesión',
        description: message,
      });
    } finally {
      navigate('/login?mode=admin', { replace: true, state: { mode: 'admin' } });
    }
  };

  return (
    <div className="group relative">
      <button
        type="button"
        className={cn(
          'inline-flex rounded-full outline-none',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background',
        )}
        aria-label="Abrir menú de perfil"
      >
        <Avatar className="size-10 cursor-pointer">
          <AvatarImage alt={displayName} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </button>

      <div
        className={cn(
          'invisible absolute right-0 bottom-full z-50 mb-3 w-64 translate-y-2 rounded-xl border border-border bg-popover p-1 opacity-0 shadow-xl',
          'transition-all duration-200',
          'group-hover:visible group-hover:translate-y-0 group-hover:opacity-100',
          'group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100',
        )}
      >
        <div className="flex items-center gap-3 rounded-lg px-3 py-3">
          <Avatar className="size-10">
            <AvatarImage alt={displayName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-popover-foreground">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
        </div>

        <div className="my-1 h-px bg-border" />

        <div className="space-y-0.5 p-1">
          {PROFILE_ITEMS.map(({ label, icon: Icon, to }) => (
            <Link key={label} to={to} className={itemClass}>
              <Icon className="size-4" />
              <span>{label}</span>
            </Link>
          ))}
        </div>

        <div className="my-1 h-px bg-border" />

        <button
          type="button"
          onClick={() => void handleLogout()}
          className={cn(itemClass, 'text-destructive hover:bg-destructive/10 hover:text-destructive')}
        >
          <LogOut className="size-4" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
}
