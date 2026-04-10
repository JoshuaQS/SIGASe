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
    <header className="sticky top-0 z-50 border-b border-border/70 bg-topbar/85 shadow-lg shadow-black/5 backdrop-blur supports-[backdrop-filter]:bg-topbar/75">
      <div className="flex items-center justify-between px-6 py-5">
        {/* Logo y Branding */}
        <div className="flex items-center gap-4">
          <div className="w-11 h-11  rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <BookOpen className="w-7 h7 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground text-xl tracking-tight">{panelTitle}</span>
              <Badge
                variant="filled"
                className="auth-shine-chip h-4"
              >
                SIGASe
                <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
                  <span className="absolute top-[-100%] left-[-100%] h-[300%] w-[50%] rotate-45 animate-chip-shine-diagonal bg-gradient-to-r from-transparent via-primary-foreground/35 to-transparent" />
                </span>
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-none mt-1">{panelSubtitle}</p>
          </div>
        </div>

        {/* Acciones de la derecha */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button className="p-2.5 transition-colors relative text-muted-foreground hover:text-foreground">
              <Bell className="w-5 h-5" />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border border-card/90 bg-muted-foreground/70 shadow-sm" />
            </button>
            <ThemeToggle className="h-10 w-10" />
            <div className="mx-1 h-6 w-px bg-muted-foreground/50" />
            <AdminProfileMenu />
          </div>
        </div>
      </div>

      <nav className="w-full overflow-x-auto scrollbar-none bg-card">
        <div
          className="grid w-full items-stretch"
          style={{
            gridTemplateColumns: `repeat(${visibleNavItems.length}, minmax(0, 1fr))`,
            minWidth: `${visibleNavItems.length * 10.5}rem`,
          }}
        >
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex h-full w-full items-center justify-center gap-2 px-4 py-3 text-[12px] font-semibold uppercase tracking-wider whitespace-nowrap transition-all border-b-2",
                  isActive
                    ? "border-primary text-primary bg-primary/[0.03]"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )
              }
            >
              <item.icon className="w-3 h-3" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </header>
  );
}
