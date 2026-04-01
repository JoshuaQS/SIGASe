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
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { AdminProfileMenu } from './admin-profile-menu';

const navItems = [
  { id: 'monitoreo', label: 'Monitoreo', icon: BarChart2, path: '/admin/monitoreo-reportes' },
  { id: 'elibro', label: 'Estado eLibro', icon: Activity, path: '/admin/elibro-status' },
  { id: 'estudiantes', label: 'Estudiantes', icon: GraduationCap, path: '/admin/estudiantes' },
  { id: 'administradores', label: 'Administradores', icon: Users, path: '/admin/administradores' },
  { id: 'logs-acceso', label: 'Logs de Acceso', icon: FileText, path: '/admin/logs-acceso' },
  { id: 'logs-auditoria', label: 'Auditoría', icon: Shield, path: '/admin/logs-auditoria' },
];

export function AdminTopbar() {
  return (
    <header className="border-b border-border bg-topbar sticky top-0 z-50 shadow-sm">
      <div className="flex items-center justify-between px-6 py-8">
        {/* Logo y Branding */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <BookOpen className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground text-xl tracking-tight">Panel de administración</span>
              <Badge variant="secondary" className="text-[14px] h-8 px-5.5 font-bold bg-primary/5 text-primary border-primary/10">SIGASe</Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-none mt-1">Sistema Integral de Gestión Académica · UTEZ</p>
          </div>
        </div>

        {/* Acciones de la derecha */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button className="p-2.5 transition-colors relative text-muted-foreground hover:text-foreground">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-card shadow-sm" />
            </button>
            <ThemeToggle className="h-10 w-10" />
            <div className="w-px h-6 bg-border/60 mx-1" />
            <AdminProfileMenu />
          </div>
        </div>
      </div>

      {/* Navegación Horizontal (Tabs) - Reducida a la mitad */}
      <nav className="flex items-center gap-0 px-6 overflow-x-auto scrollbar-none border-t border-border/40 bg-card">
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border-b-2 -mb-px",
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
      </nav>
    </header>
  );
}
