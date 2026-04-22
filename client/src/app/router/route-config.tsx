import { lazy, Suspense } from 'react'
import { Navigate, type RouteObject } from 'react-router-dom'
import { ADMIN_ROLES, ROLE_ADMIN_TI } from '@/features/auth/types/auth-user'

import { GuestGuard } from './guards/guest-guard'
import { SessionGuard } from './guards/session-guard'
import { RoleGuard } from './guards/role-guard'
import {
  StudentMustChangePasswordGuard,
  ForcePasswordChangeGuard,
} from './guards/student-password-guard'

import AuthLayout from './layouts/auth-layout'
import AdminLayout from './layouts/admin-layout'
import StudentLayout from './layouts/student-layout'

const LoginPage = lazy(() => import('@/features/auth/pages/login-page'))
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/forgot-password-page'))
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/reset-password-page'))
const StudentOnboardingPasswordPage = lazy(
  () => import('@/features/auth/pages/student-onboarding-password-page'),
)
const ForcePasswordChangeShellPage = lazy(
  () => import('@/features/student-portal/pages/force-password-change-shell'),
)

const StudentsManagementPage = lazy(
  () => import('@/features/students/pages/students-management-page'),
)
const AdminsManagementPage = lazy(
  () => import('@/features/admins/pages/admins-management-page'),
)
const MonitoringAndReportsPage = lazy(
  () => import('@/features/dashboard/pages/monitoring-and-reports-page'),
)

const AccessLogsPage = lazy(
  () => import('@/features/access-logs/pages/access-logs-page'),
)
const AuditLogsPage = lazy(
  () => import('@/features/audit-logs/pages/audit-logs-page'),
)
const ElibroSsoConfigPage = lazy(
  () => import('@/features/elibro-config/pages/elibro-sso-config-page'),
)

const PortalPage = lazy(() => import('@/features/student-portal/pages/portal-page'))
const ForcePasswordChangeShell = lazy(
  () => import('@/features/student-portal/pages/force-password-change-shell'),
)

const ForbiddenPage = lazy(() => import('@/pages/forbidden-page'))
const NotFoundPage = lazy(() => import('@/pages/not-found-page'))

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
      Cargando...
    </div>
  )
}

function withSuspense(node: React.ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{node}</Suspense>
}

export const routes: RouteObject[] = [
  { path: '/', element: <Navigate to="/login" replace /> },

  {
    element: <GuestGuard />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: withSuspense(<LoginPage />) },
          { path: '/forgot-password', element: withSuspense(<ForgotPasswordPage />) },
          { path: '/reset-password', element: withSuspense(<ResetPasswordPage />) },
          {
            path: '/activate-student-account',
            element: withSuspense(<StudentOnboardingPasswordPage />),
          },
        ],
      },
    ],
  },

  {
    element: <SessionGuard />,
    children: [
      {
        element: <RoleGuard allowedRoles={ADMIN_ROLES} redirectTo="/login" />,
        children: [
          {
            path: '/design-system',
            element: <Navigate to="/admin/design-system" replace />,
          },
          {
            path: '/admin',
            element: <AdminLayout />,
            children: [
              { index: true, element: <Navigate to="monitoreo-reportes" replace /> },
              {
                path: 'monitoreo-reportes',
                element: withSuspense(<MonitoringAndReportsPage />),
              },
              {
                path: 'estudiantes',
                element: withSuspense(<StudentsManagementPage />),
              },
              {
                path: 'logs-acceso',
                element: withSuspense(<AccessLogsPage />),
              },
              {
                element: <RoleGuard allowedRoles={[ROLE_ADMIN_TI]} redirectTo="/403" />,
                children: [
                  {
                    path: 'elibro-status',
                    element: withSuspense(<ElibroSsoConfigPage />),
                  },
                  {
                    path: 'administradores',
                    element: withSuspense(<AdminsManagementPage />),
                  },
                  {
                    path: 'logs-auditoria',
                    element: withSuspense(<AuditLogsPage />),
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  {
    element: <SessionGuard />,
    children: [
      {
        element: <ForcePasswordChangeGuard />,
        children: [
          {
            path: '/student/force-password-change',
            element: withSuspense(<ForcePasswordChangeShell />),
          },
        ],
      },
      {
        path: '/student',
        element: <StudentLayout />,
        children: [
          { index: true, element: <Navigate to="portal" replace /> },
          {
            element: <StudentMustChangePasswordGuard />,
            children: [
              { path: 'portal', element: withSuspense(<PortalPage />) },
            ],
          },
        ],
      },
    ],
  },

  { path: '/403', element: withSuspense(<ForbiddenPage />) },
  { path: '*', element: withSuspense(<NotFoundPage />) },
]
