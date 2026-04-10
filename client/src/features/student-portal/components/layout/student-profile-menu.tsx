import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CircleUserRound,
  LogOut,
} from 'lucide-react';

import { authSession } from '@/features/auth/store/auth-session-store';
import { useAuthUser } from '@/features/auth/hooks/use-auth-user';
import { StudentProfileModal } from '@/features/students/components/modals/student-profile-modal';
import { useAppToast } from '@/shared/components/ui/app-toast-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { cn } from '@/shared/lib/utils';

const itemClass =
  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-popover-foreground transition-colors hover:bg-muted';

const StudentProfileMenu = () => {
  const user = useAuthUser();
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const [profileOpen, setProfileOpen] = useState(false);
  const displayName = user?.displayName || 'Estudiante UTEZ';
  const email = user?.email || 'estudiante@utez.edu.mx';
  const shortTopbarName = (() => {
    const parts = displayName.split(' ').map((p) => p.trim()).filter(Boolean);
    const first = parts[0] ?? displayName;
    const last = parts.length >= 2 ? parts[parts.length - 1] : '';
    const lastInitial = last ? last.charAt(0).toUpperCase() : '';
    return lastInitial ? `${first} ${lastInitial}.` : first;
  })();
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
        description: 'Tu sesión de estudiante ha finalizado.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cerrar la sesión.';
      showToast({
        severity: 'error',
        title: 'Error al cerrar sesión',
        description: message,
      });
    } finally {
      navigate('/login?mode=student', { replace: true, state: { mode: 'student' } });
    }
  };

  return (
    <>
      <StudentProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />

      <div className="group relative">
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-2 rounded-full outline-none',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background',
          )}
          aria-label="Abrir menú de perfil"
        >
          <Avatar className="size-9 cursor-pointer border border-border/70 bg-card ring-1 ring-foreground/5">
            <AvatarImage alt={displayName} />
            <AvatarFallback className="bg-card font-semibold text-foreground">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden sm:block text-sm font-semibold text-foreground max-w-[220px] truncate">
            {shortTopbarName}
          </span>
        </button>

        <div
          className={cn(
            'invisible absolute right-0 top-full z-50 mt-3 w-64 -translate-y-2 rounded-xl border border-border bg-popover p-1 opacity-0 shadow-xl',
            'transition-all duration-200',
            'group-hover:visible group-hover:translate-y-0 group-hover:opacity-100',
            'group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100',
          )}
        >
          <div className="flex items-center gap-3 rounded-lg px-3 py-3">
            <Avatar className="size-10">
              <AvatarImage alt={displayName} />
              <AvatarFallback className="bg-muted text-foreground">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-popover-foreground">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
          </div>

          <div className="my-1 h-px bg-border" />

          <div className="space-y-0.5 p-1">
            <button
              type="button"
              className={itemClass}
              onClick={() => setProfileOpen(true)}
            >
              <CircleUserRound className="size-4" />
              <span>Ver perfil</span>
            </button>
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
    </>
  );
}

export default StudentProfileMenu;
