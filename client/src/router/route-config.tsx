import { Navigate, type RouteObject } from 'react-router-dom';
import { ADMIN_ROLES } from '@//auth/auth-user';

import { GuestGuard } from './guards/GuestGuard';
import { SessionGuard } from './guards/SessionGuard';
import { RoleGuard } from './guards/RoleGuard';
import {
  StudentMustChangePasswordGuard,
  ForcePasswordChangeGuard,
} from './guards/StudentPasswordGuard';

import AuthLayout from './layouts/AuthLayout';
import AdminLayout from './layouts/AdminLayout';
import StudentLayout from './layouts/StudentLayout';

import LoginPage from '@/modules/auth/pages/LoginPage';
import ForgotPasswordPage from '@/modules/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/modules/auth/pages/ResetPasswordPage';


import StudentsManagement from '@/modules/admin/pages/StudentsManagment';
import AdminsManagement from '@/modules/admin/pages/AdminsManagement';
import ReportsOverviewSection from '@/modules/admin/pages/MonitoringAndReports';
import AccessLogsSection from '@/modules/admin/pages/AccessLogs';
import AuditLogsSection from '@/modules/admin/pages/AuditLogs';
import ElibroSsoConfig from '@/modules/admin/pages/ElibroSsoConfig';

import Portal from '@/modules/student/pages/Portal';
import ForcePasswordChangePage from '@/modules/student/pages/ForcePasswordChange';

import ForbiddenPage from '@/modules/system/pages/ForbiddenPage';
import NotFoundPage from '@/modules/system/pages/NotFoundPage';

export const routes: RouteObject[] = [
  // --- Redirect root ---
  { path: '/', element: <Navigate to="/login" replace /> },

  // --- Guest-only: auth pages ---
  {
    element: <GuestGuard />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/forgot-password', element: <ForgotPasswordPage /> },
          { path: '/reset-password', element: <ResetPasswordPage /> },
        ],
      },
    ],
  },

  // --- Admin routes (session + role protected) ---
  {
    element: <SessionGuard />,
    children: [
      {
        element: <RoleGuard allowedRoles={ADMIN_ROLES} redirectTo="/login" />,
        children: [
          {
            path: '/admin',
            element: <AdminLayout />,
            children: [
              { index: true, element: <Navigate to="monitoreo-reportes" replace /> },
              { path: 'monitoreo-reportes', element: <ReportsOverviewSection /> },
              { path: 'elibro-status', element: <ElibroSsoConfig /> },
              { path: 'estudiantes', element: <StudentsManagement /> },
              { path: 'administradores', element: <AdminsManagement /> },
              { path: 'logs-acceso', element: <AccessLogsSection /> },
              { path: 'logs-auditoria', element: <AuditLogsSection /> },
            ],
          },
        ],
      },
    ],
  },

  // --- Student routes (session protected) ---
  {
    element: <SessionGuard />,
    children: [
      {
        path: '/student',
        element: <StudentLayout />,
        children: [
          { index: true, element: <Navigate to="portal" replace /> },
          {
            element: <StudentMustChangePasswordGuard />,
            children: [
              { path: 'portal', element: <Portal /> },
            ],
          },
          {
            element: <ForcePasswordChangeGuard />,
            children: [
              { path: 'force-password-change', element: <ForcePasswordChangePage /> },
            ],
          },
        ],
      },
    ],
  },
  // --- Error pages ---
  { path: '/403', element: <ForbiddenPage /> },
  { path: '*', element: <NotFoundPage /> },
];
