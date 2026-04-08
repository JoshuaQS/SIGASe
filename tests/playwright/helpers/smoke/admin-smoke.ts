import type { Page } from '@playwright/test';

export const ADMIN_CREDENTIALS = {
  email: 'admin.ti@utez.edu.mx',
  password: 'AdminPass.123',
} as const;

export const EXPIRED_ADMIN_SESSION = {
  id: 'admin-ti-smoke',
  email: ADMIN_CREDENTIALS.email,
  displayName: 'Admin TI SIGASe',
  role: 'ROLE_ADMIN_TI',
  token: 'expired-smoke-token',
  tokenType: 'Bearer',
  expiresInSeconds: 0,
  mustChangePassword: false,
} as const;

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  status: number;
};

function apiEnvelope<T>(data: T, message = 'OK'): ApiEnvelope<T> {
  return {
    success: true,
    message,
    data,
    status: 200,
  };
}

function toJsonBody<T>(data: T, message?: string) {
  return JSON.stringify(apiEnvelope(data, message));
}

const dashboardSummary = {
  totalStudents: 128,
  activeStudents: 120,
  inactiveStudents: 8,
  successfulAccessesInRange: 34,
  failedAccessesInRange: 7,
  successRate: 82.93,
  uniqueStudentsWithSuccessfulAccess: 22,
  currentElibroConfigStatus: 'ACTIVE_VALID',
  lastAccessAt: '2026-04-07T11:25:00.000Z',
  lastSuccessfulAccessAt: '2026-04-07T11:20:00.000Z',
  lastFailedAccessAt: '2026-04-07T10:45:00.000Z',
};

const dashboardTrends = {
  dateFrom: '2026-04-01T00:00:00.000Z',
  dateTo: '2026-04-07T23:59:59.999Z',
  points: [
    { day: '2026-04-01', successful: 4, failed: 1 },
    { day: '2026-04-02', successful: 5, failed: 0 },
    { day: '2026-04-03', successful: 8, failed: 2 },
    { day: '2026-04-04', successful: 6, failed: 1 },
    { day: '2026-04-05', successful: 7, failed: 1 },
    { day: '2026-04-06', successful: 3, failed: 1 },
    { day: '2026-04-07', successful: 1, failed: 1 },
  ],
};

const dashboardTopStudents = {
  dateFrom: '2026-04-01T00:00:00.000Z',
  dateTo: '2026-04-07T23:59:59.999Z',
  limit: 5,
  sortDir: 'desc',
  students: [
    {
      studentId: 'stu-1',
      name: 'Ada Lovelace',
      enrollmentId: '2026001',
      careerCode: 'ISC',
      careerName: 'Ingenieria en Sistemas Computacionales',
      successfulAccesses: 12,
      failedAccesses: 2,
      totalAccesses: 14,
    },
    {
      studentId: 'stu-2',
      name: 'Grace Hopper',
      enrollmentId: '2026002',
      careerCode: 'ISC',
      careerName: 'Ingenieria en Sistemas Computacionales',
      successfulAccesses: 9,
      failedAccesses: 1,
      totalAccesses: 10,
    },
    {
      studentId: 'stu-3',
      name: 'Katherine Johnson',
      enrollmentId: '2026003',
      careerCode: 'MEC',
      careerName: 'Ingenieria Mecanica',
      successfulAccesses: 6,
      failedAccesses: 1,
      totalAccesses: 7,
    },
    {
      studentId: 'stu-4',
      name: 'Marie Curie',
      enrollmentId: '2026004',
      careerCode: 'IND',
      careerName: 'Ingenieria Industrial',
      successfulAccesses: 5,
      failedAccesses: 1,
      totalAccesses: 6,
    },
    {
      studentId: 'stu-5',
      name: 'Alan Turing',
      enrollmentId: '2026005',
      careerCode: 'ISC',
      careerName: 'Ingenieria en Sistemas Computacionales',
      successfulAccesses: 2,
      failedAccesses: 2,
      totalAccesses: 4,
    },
  ],
};

const dashboardTopCareers = {
  dateFrom: '2026-04-01T00:00:00.000Z',
  dateTo: '2026-04-07T23:59:59.999Z',
  limit: 5,
  sortDir: 'desc',
  careers: [
    {
      careerCode: 'ISC',
      careerName: 'Ingenieria en Sistemas Computacionales',
      successfulAccesses: 21,
      failedAccesses: 5,
      totalAccesses: 26,
    },
    {
      careerCode: 'IND',
      careerName: 'Ingenieria Industrial',
      successfulAccesses: 8,
      failedAccesses: 1,
      totalAccesses: 9,
    },
    {
      careerCode: 'MEC',
      careerName: 'Ingenieria Mecanica',
      successfulAccesses: 5,
      failedAccesses: 1,
      totalAccesses: 6,
    },
  ],
};

const accessLogFixture = {
  content: [
    {
      id: 'log-1',
      occurredAt: '2026-04-07T11:20:00.000Z',
      actorType: 'STUDENT',
      scope: 'ELIBRO',
      actorId: 'stu-1',
      actorName: 'Ada Lovelace',
      actorEmail: 'ada.lovelace@utez.edu.mx',
      result: 'SUCCESS',
      reason: 'Acceso permitido al portal eLibro',
      requestId: 'REQ-1001',
      correlationId: 'CORR-2001',
      sessionId: 'SESS-3001',
      ipAddressMasked: '10.0.0.xxx',
      userAgentSanitized: 'Chrome/125',
      latencyMs: 120,
      nextUrl: 'https://elibro.example/sso',
      redirectUrl: 'https://elibro.example/home',
      providerStatusCode: 200,
      providerErrorCode: null,
      providerErrorMessage: null,
      channelName: 'Elibro SSO',
      metadata: {
        source: 'smoke-test',
      },
    },
  ],
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
};

export async function loginAsAdmin(page: Page) {
  await page.route('**/api/v1/auth/admin/me**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: toJsonBody({
        id: 'admin-ti-smoke',
        email: ADMIN_CREDENTIALS.email,
        name: 'Admin',
        lastNamePaternal: 'TI',
        lastNameMaternal: null,
        role: 'ROLE_ADMIN_TI',
      }),
    });
  });

  await page.addInitScript((session) => {
    window.localStorage.setItem('sigase.auth.user', JSON.stringify(session));
  }, {
    id: 'admin-ti-smoke',
    email: ADMIN_CREDENTIALS.email,
    displayName: 'Admin TI SIGASe',
    role: 'ROLE_ADMIN_TI',
    token: 'smoke-admin-token',
    tokenType: 'Bearer',
    expiresInSeconds: 3600,
    mustChangePassword: false,
  });

  await page.goto('/admin/monitoreo-reportes');
  await page.waitForURL(/\/admin\/monitoreo-reportes/);
}

export async function seedExpiredAdminSession(page: Page) {
  await page.addInitScript((session) => {
    window.localStorage.setItem('sigase.auth.user', JSON.stringify(session));
  }, EXPIRED_ADMIN_SESSION);
}

export async function mockDashboardApis(page: Page) {
  await page.route('**/api/v1/dashboard/summary**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: toJsonBody(dashboardSummary),
    });
  });

  await page.route('**/api/v1/dashboard/access-trends**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: toJsonBody(dashboardTrends),
    });
  });

  await page.route('**/api/v1/dashboard/top-students**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: toJsonBody(dashboardTopStudents),
    });
  });

  await page.route('**/api/v1/dashboard/top-careers**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: toJsonBody(dashboardTopCareers),
    });
  });

  await page.route('**/api/v1/dashboard/export**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const format = requestUrl.searchParams.get('format') ?? 'csv';
    const filename = `dashboard-monitoring.${format}`;

    await route.fulfill({
      status: 200,
      contentType: format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv',
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
      body: format === 'xlsx'
        ? 'mock xlsx payload'
        : 'date,successful,failed\n2026-04-07,34,7\n',
    });
  });
}

export async function mockAccessLogsApis(page: Page) {
  await page.route('**/api/v1/access-logs**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: toJsonBody(accessLogFixture),
    });
  });

  await page.route('**/api/v1/reports/access-logs/export**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const format = requestUrl.searchParams.get('format') ?? 'csv';

    await route.fulfill({
      status: 200,
      contentType: format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv',
      headers: {
        'Content-Disposition': `attachment; filename="access-logs-export.${format}"`,
      },
      body: format === 'xlsx'
        ? 'mock xlsx payload'
        : 'occurredAt,actorType,scope,result\n2026-04-07T11:20:00Z,STUDENT,ELIBRO,SUCCESS\n',
    });
  });
}
