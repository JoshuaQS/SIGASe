import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  BarChart2,
  Activity,
  GraduationCap,
  Users,
  FileText,
  Shield,
  Bell,
  BookOpen,
  SlidersHorizontal,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { AdminProfileMenu } from './admin-profile-menu';
import { useAuthUser } from '@/hooks/use-auth-user';
import { ROLE_ADMIN_BIBLIOTECA, ROLE_ADMIN_TI } from '@/auth/auth-user';

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
  { id: 'logs-auditoria', label: 'Logs de Auditoría', icon: Shield, path: '/admin/logs-auditoria' },
  { id: 'inputs-custom', label: 'Inputs Custom', icon: SlidersHorizontal, path: '/admin/inputs-custom' },
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
    <header className="border-b border-border bg-topbar sticky top-0 z-50 shadow-sm">
      <div className="flex items-center justify-between px-6 py-5">
        {/* Logo y Branding */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <BookOpen className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground text-xl tracking-tight">{panelTitle}</span>
              <Badge
                variant="filled"
                className=""
              >
                SIGASe
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
