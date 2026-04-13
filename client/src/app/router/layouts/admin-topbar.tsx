import { NavLink } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';
import {
  BarChart2,
  Activity,
  GraduationCap,
  Users,
  FileText,
  Shield,
  Bell,
  BookOpen,
} from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { ThemeToggle } from '@/shared/components/ui/theme-toggle';
import { AdminProfileMenu } from './admin-profile-menu';
import { useAuthUser } from '@/features/auth/hooks/use-auth-user';
import { ROLE_ADMIN_BIBLIOTECA, ROLE_ADMIN_TI } from '@/features/auth/types/auth-user';

type NavItem = {
  id: string;
  label: string;
  icon: typeof BarChart2;
  path: string;
  roles?: readonly string[];
};

const navItems: NavItem[] = [
  { id: 'monitoreo', label: 'Monitoreo', icon: BarChart2, path: '/admin/monitoreo-reportes' },
  { id: 'elibro', label: 'Configuración eLibro', icon: Activity, path: '/admin/elibro-status', roles: [ROLE_ADMIN_TI] },
  { id: 'estudiantes', label: 'Estudiantes', icon: GraduationCap, path: '/admin/estudiantes' },
  { id: 'administradores', label: 'Administradores', icon: Users, path: '/admin/administradores', roles: [ROLE_ADMIN_TI] },
  { id: 'logs-acceso', label: 'Logs de Acceso', icon: FileText, path: '/admin/logs-acceso' },
  { id: 'logs-auditoria', label: 'Logs de Auditoría', icon: Shield, path: '/admin/logs-auditoria', roles: [ROLE_ADMIN_TI] },
];

export function AdminTopbar() {
  const authUser = useAuthUser();
  const isLibrarian = authUser?.role === ROLE_ADMIN_BIBLIOTECA;
  const visibleNavItems = navItems.filter((item) => !item.roles || item.roles.includes(authUser?.role ?? ''));
  const panelTitle = isLibrarian ? 'Panel Biblioteca' : 'Panel de administración';
  const panelSubtitle = isLibrarian
    ? 'Gestión de estudiantes, monitoreo y auditoría de accesos'
    : 'Sistema Integral de Gestión y Acceso SSO eLibro';

  return (
    <header className="sticky top-0 z-50 bg-topbar/85 shadow-lg shadow-black/5 backdrop-blur supports-[backdrop-filter]:bg-topbar/75">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm">
            <BookOpen className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-md font-bold tracking-tight text-foreground">{panelTitle}</span>
              <Badge variant="filled" className="h-4 px-1.5 text-[10px] font-semibold">
                SIGASe
              </Badge>
            </div>
            <p className="mt-0.5 text-[11px] leading-none text-muted-foreground">{panelSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">

          <button
            type="button"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
            aria-label="Notificaciones"
          >
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
          </button>
          <ThemeToggle className="h-9 w-9 [&_svg]:size-5" />
          <AdminProfileMenu />
        </div>
      </div>

      <nav className="w-full bg-card h-8">
        <div className="overflow-x-auto scrollbar-none">
          <div
            className="grid w-full min-w-0"
            style={{
              gridTemplateColumns: `repeat(${visibleNavItems.length}, minmax(0, 1fr))`,
            }}
          >
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex min-w-0 w-full items-center justify-center gap-2 border-b-4 border-transparent px-2 h-8 text-center text-sm font-medium whitespace-nowrap transition-all',
                    isActive
                      ? 'border-primary text-primary'
                      : 'text-muted-foreground hover:border-transparent hover:text-foreground',
                  )
                }
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
}
