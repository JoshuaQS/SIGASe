import {
  BarChart3Icon,
  ClipboardListIcon,
  FileSearchIcon,
  GraduationCapIcon,
  HomeIcon,
  ShieldCheckIcon,
  UsersIcon,
} from 'lucide-react';

export const ADMIN_DASHBOARD_SECTIONS = {
  WELCOME: 'welcome',
  ELIBRO_STATUS: 'elibro-status',
  MONITORING_REPORTS: 'monitoreo-reportes',
  STUDENTS: 'estudiantes',
  ADMINS: 'administradores',
  ACCESS_LOGS: 'logs-acceso',
  AUDIT_LOGS: 'logs-auditoria',
} as const;

export const ADMIN_SIDEBAR_GROUPS = [
  {
    title: 'Overview',
    items: [
      { id: ADMIN_DASHBOARD_SECTIONS.WELCOME, title: 'Dashboard', icon: HomeIcon },
      { id: ADMIN_DASHBOARD_SECTIONS.ELIBRO_STATUS, title: 'eLibro', icon: ShieldCheckIcon },
      { id: ADMIN_DASHBOARD_SECTIONS.MONITORING_REPORTS, title: 'Monitoreo y Reportes', icon: BarChart3Icon },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { id: ADMIN_DASHBOARD_SECTIONS.STUDENTS, title: 'Estudiantes', icon: GraduationCapIcon },
      { id: ADMIN_DASHBOARD_SECTIONS.ADMINS, title: 'Administradores', icon: UsersIcon },
    ],
  },
  {
    title: 'Registros',
    items: [
      { id: ADMIN_DASHBOARD_SECTIONS.ACCESS_LOGS, title: 'Registros de acceso', icon: ClipboardListIcon },
      { id: ADMIN_DASHBOARD_SECTIONS.AUDIT_LOGS, title: 'Registros de auditoría', icon: FileSearchIcon },
    ],
  },
] as const;
