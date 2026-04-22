import { expect, test, type Locator, type Page, type Request } from '@playwright/test';

type FilterType = 'alumno' | 'carrera';
type Scope = 'individual' | 'todos' | 'varias' | 'todas';
type AccessType = 'exitoso' | 'fallido' | 'ambos';
type SortOrder = 'asc' | 'desc';
type AccessResult = 'SUCCESS' | 'FAILED' | 'ALL';
type RankingMode = 'NONE' | 'TOP';

type Scenario = {
  id: number;
  name: string;
  filterType: FilterType;
  scope: Scope;
  accessType: AccessType;
  dateEnabled: boolean;
  rankingEnabled: boolean;
  topN: number | null;
  sortOrder: SortOrder;
  selectedCareerCount: 0 | 1 | 2;
};

type ExpectedRequest = {
  scope: 'STUDENTS' | 'CAREERS';
  mode: 'INDIVIDUAL' | 'MULTI' | 'ALL';
  studentId: string | null;
  careerIds: string[] | null;
  accessResult: AccessResult;
  dateFilterType: 'NONE' | 'CUSTOM_RANGE';
  rankingMode: RankingMode;
  topN: number | null;
  sortDirection: 'ASC' | 'DESC';
  widgetControls: null;
};

const ACCESS_TYPES: readonly AccessType[] = ['exitoso', 'fallido', 'ambos'];
const DATE_FLAGS: readonly boolean[] = [false, true];
const SORT_ORDERS: readonly SortOrder[] = ['desc', 'asc'];
const TOP_N_OPTIONS: readonly number[] = [1, 5, 10, 20, 50];

const ACCESS_LABELS: Record<AccessType, string> = {
  exitoso: 'Accesos a eLibro: Exitosos',
  fallido: 'Accesos a eLibro: Fallidos',
  ambos: 'Accesos a eLibro: Ambos',
};

const ACCESS_RESULTS: Record<AccessType, AccessResult> = {
  exitoso: 'SUCCESS',
  fallido: 'FAILED',
  ambos: 'ALL',
};

const SCOPE_LABELS: Record<Scope, string> = {
  individual: 'Individual',
  todos: 'Todos',
  varias: 'Varias',
  todas: 'Todas',
};

const SORT_LABELS: Record<SortOrder, string> = {
  desc: 'Mayor a menor (DESC)',
  asc: 'Menor a mayor (ASC)',
};

const ADMIN_SESSION = {
  id: 'admin-ti-composer-v3',
  email: 'admin.ti@utez.edu.mx',
  displayName: 'Admin TI SIGASe',
  role: 'ROLE_ADMIN_TI',
  token: 'playwright-admin-token',
  tokenType: 'Bearer',
  expiresInSeconds: 3600,
  mustChangePassword: false,
};

const STUDENT_ITEM = {
  id: 'stu-ada',
  displayLabel: 'Ada Lovelace (2026001)',
  subtitle: '2026001 · ISC · Activo',
  enrollmentId: '2026001',
  fullName: 'Ada Lovelace',
  career: {
    id: 'car-isc',
    code: 'ISC',
    name: 'Ingeniería en Sistemas Computacionales',
  },
  status: 'ACTIVE',
};

const CAREER_ITEMS = [
  {
    id: 'car-isc',
    displayLabel: 'ISC - Ingeniería en Sistemas Computacionales',
    subtitle: 'Ingeniería en Sistemas Computacionales',
    code: 'ISC',
    name: 'Ingeniería en Sistemas Computacionales',
    status: 'ACTIVE',
  },
  {
    id: 'car-ind',
    displayLabel: 'IND - Ingeniería Industrial',
    subtitle: 'Ingeniería Industrial',
    code: 'IND',
    name: 'Ingeniería Industrial',
    status: 'ACTIVE',
  },
  {
    id: 'car-mec',
    displayLabel: 'MEC - Ingeniería Mecánica',
    subtitle: 'Ingeniería Mecánica',
    code: 'MEC',
    name: 'Ingeniería Mecánica',
    status: 'ACTIVE',
  },
] as const;

function toEnvelope<T>(data: T) {
  return {
    success: true,
    message: 'OK',
    data,
    status: 200,
  };
}

const DASHBOARD_ANALYSIS_STUB = {
  summary: {
    scope: 'STUDENTS',
    mode: 'ALL',
    accessResult: 'ALL',
    dateFilterType: 'NONE',
    dateFrom: null,
    dateTo: null,
    rankingMode: 'NONE',
    topN: null,
    sortDirection: 'DESC',
  },
  layoutType: 'OVERVIEW',
  widgets: [],
};

const DASHBOARD_METADATA_STUB = {
  scopes: ['STUDENTS', 'CAREERS'],
  modes: ['INDIVIDUAL', 'ALL', 'MULTI'],
  accessResults: ['ALL', 'SUCCESS', 'FAILED'],
  rankingModes: ['NONE', 'TOP'],
  dateStrategy: {
    allowed: ['NONE', 'CUSTOM_RANGE'],
    defaultType: 'NONE',
    defaultRollingRangeDays: 7,
  },
  defaults: {
    accessResult: 'ALL',
    dateFilterType: 'NONE',
    rankingMode: 'NONE',
    sortDirection: 'DESC',
  },
  contract: {
    version: '1',
    supportedLayouts: ['OVERVIEW'],
    capabilities: {
      adaptiveAnalysis: true,
      contextualOptions: true,
      autocomplete: true,
      export: true,
    },
  },
};

function waitForDashboardAnalysisPost(page: Page): Promise<Request> {
  return page.waitForRequest((req) => {
    if (req.method() !== 'POST') return false;
    const { pathname } = new URL(req.url());
    return pathname.endsWith('/dashboard/analysis') && !pathname.includes('/analysis/export');
  });
}

async function mockDashboardAnalysisApis(page: Page) {
  await page.route('**/api/v1/dashboard/analysis/metadata**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(toEnvelope(DASHBOARD_METADATA_STUB)),
    });
  });

  await page.route(
    (url) => {
      try {
        const { pathname } = new URL(url);
        return pathname.endsWith('/dashboard/analysis') && !pathname.includes('/export');
      } catch {
        return false;
      }
    },
    async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(toEnvelope(DASHBOARD_ANALYSIS_STUB)),
      });
    },
  );
}

function parseAnalysisPostBody(raw: string | null | Buffer) {
  const text = typeof raw === 'string' ? raw : raw?.toString('utf8') ?? '';
  if (!text) throw new Error('missing POST body');
  return JSON.parse(text) as {
    scope: 'STUDENTS' | 'CAREERS';
    mode: 'INDIVIDUAL' | 'MULTI' | 'ALL';
    studentId: string | null;
    careerIds: string[] | null;
    accessResult: AccessResult;
    dateFilterType: 'NONE' | 'CUSTOM_RANGE';
    dateFrom: string | null;
    dateTo: string | null;
    rankingMode: RankingMode;
    topN: number | null;
    sortDirection: 'ASC' | 'DESC';
    widgetControls: null;
  };
}

function buildScenarios(): Scenario[] {
  const scenarios: Scenario[] = [];
  let id = 1;

  for (const accessType of ACCESS_TYPES) {
    for (const dateEnabled of DATE_FLAGS) {
      scenarios.push({
        id: id++,
        name: 'alumno-individual',
        filterType: 'alumno',
        scope: 'individual',
        accessType,
        dateEnabled,
        rankingEnabled: false,
        topN: null,
        sortOrder: 'desc',
        selectedCareerCount: 0,
      });
    }
  }

  for (const accessType of ACCESS_TYPES) {
    for (const dateEnabled of DATE_FLAGS) {
      for (const sortOrder of SORT_ORDERS) {
        scenarios.push({
          id: id++,
          name: 'alumno-todos-sin-ranking',
          filterType: 'alumno',
          scope: 'todos',
          accessType,
          dateEnabled,
          rankingEnabled: false,
          topN: null,
          sortOrder,
          selectedCareerCount: 0,
        });
      }
    }
  }

  for (const accessType of ACCESS_TYPES) {
    for (const dateEnabled of DATE_FLAGS) {
      for (const topN of TOP_N_OPTIONS) {
        for (const sortOrder of SORT_ORDERS) {
          scenarios.push({
            id: id++,
            name: 'alumno-todos-con-ranking',
            filterType: 'alumno',
            scope: 'todos',
            accessType,
            dateEnabled,
            rankingEnabled: true,
            topN,
            sortOrder,
            selectedCareerCount: 0,
          });
        }
      }
    }
  }

  for (const accessType of ACCESS_TYPES) {
    for (const dateEnabled of DATE_FLAGS) {
      scenarios.push({
        id: id++,
        name: 'carrera-individual',
        filterType: 'carrera',
        scope: 'individual',
        accessType,
        dateEnabled,
        rankingEnabled: false,
        topN: null,
        sortOrder: 'desc',
        selectedCareerCount: 1,
      });
    }
  }

  for (const accessType of ACCESS_TYPES) {
    for (const dateEnabled of DATE_FLAGS) {
      for (const topN of TOP_N_OPTIONS) {
        for (const sortOrder of SORT_ORDERS) {
          scenarios.push({
            id: id++,
            name: 'carrera-varias',
            filterType: 'carrera',
            scope: 'varias',
            accessType,
            dateEnabled,
            rankingEnabled: true,
            topN,
            sortOrder,
            selectedCareerCount: 2,
          });
        }
      }
    }
  }

  for (const accessType of ACCESS_TYPES) {
    for (const dateEnabled of DATE_FLAGS) {
      for (const topN of TOP_N_OPTIONS) {
        for (const sortOrder of SORT_ORDERS) {
          scenarios.push({
            id: id++,
            name: 'carrera-todas',
            filterType: 'carrera',
            scope: 'todas',
            accessType,
            dateEnabled,
            rankingEnabled: true,
            topN,
            sortOrder,
            selectedCareerCount: 0,
          });
        }
      }
    }
  }

  return scenarios;
}

const SCENARIOS = buildScenarios();

function getRankingMode(scenario: Scenario): RankingMode {
  if (scenario.filterType === 'alumno') {
    return scenario.scope === 'todos' && scenario.rankingEnabled ? 'TOP' : 'NONE';
  }
  return scenario.scope === 'varias' || scenario.scope === 'todas' ? 'TOP' : 'NONE';
}

function shouldShowSortOrder(scenario: Scenario): boolean {
  return (
    (scenario.filterType === 'alumno' && scenario.scope === 'todos')
    || (scenario.filterType === 'carrera' && (scenario.scope === 'varias' || scenario.scope === 'todas'))
  );
}

function buildExpectedRequest(scenario: Scenario): ExpectedRequest {
  const rankingMode = getRankingMode(scenario);

  return {
    scope: scenario.filterType === 'alumno' ? 'STUDENTS' : 'CAREERS',
    mode:
      scenario.scope === 'individual'
        ? 'INDIVIDUAL'
        : scenario.scope === 'varias'
          ? 'MULTI'
          : 'ALL',
    studentId:
      scenario.filterType === 'alumno' && scenario.scope === 'individual'
        ? STUDENT_ITEM.id
        : null,
    careerIds:
      scenario.filterType === 'carrera'
        ? scenario.scope === 'todas'
          ? null
          : scenario.scope === 'individual'
            ? [CAREER_ITEMS[0].id]
            : [CAREER_ITEMS[0].id, CAREER_ITEMS[1].id]
        : null,
    accessResult: ACCESS_RESULTS[scenario.accessType],
    dateFilterType: scenario.dateEnabled ? 'CUSTOM_RANGE' : 'NONE',
    rankingMode,
    topN: rankingMode === 'TOP' ? scenario.topN : null,
    sortDirection: scenario.sortOrder === 'asc' ? 'ASC' : 'DESC',
    widgetControls: null,
  };
}

async function mockSessionApis(page: Page) {
  await page.route('**/api/v1/auth/admin/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(toEnvelope({
        id: ADMIN_SESSION.id,
        email: ADMIN_SESSION.email,
        name: 'Admin',
        lastNamePaternal: 'TI',
        lastNameMaternal: null,
        role: ADMIN_SESSION.role,
        hasChangedTemporaryPassword: true,
      })),
    });
  });
}

async function mockNotificationsApis(page: Page) {
  await page.route(/\/api\/v1\/notifications(?:\/.*)?(?:\?.*)?$/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();

    if (method === 'GET' && pathname.endsWith('/notifications/unread-count')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(toEnvelope({ unreadCount: 0 })),
      });
      return;
    }

    if (method === 'GET' && pathname.endsWith('/notifications/preferences')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(toEnvelope({
          notifyCritical: true,
          notifySecurity: true,
          notifyAccessFailures: true,
          notifyStudentChanges: true,
          notifyConfigChanges: true,
          notifyAdminChanges: true,
        })),
      });
      return;
    }

    if (method === 'GET' && pathname.endsWith('/notifications')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(toEnvelope({
          content: [],
          page: 0,
          size: 100,
          totalElements: 0,
          totalPages: 0,
        })),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(toEnvelope(null)),
    });
  });
}

async function mockComposerSearchApis(page: Page) {
  await page.route('**/api/v1/dashboard/analysis/students/search**', async (route) => {
    const url = new URL(route.request().url());
    const query = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    const limit = Number(url.searchParams.get('limit') ?? 12);
    const items = query.length >= 2 ? [STUDENT_ITEM] : [];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(toEnvelope({
        query,
        limit,
        items,
      })),
    });
  });

  await page.route('**/api/v1/dashboard/analysis/careers/search**', async (route) => {
    const url = new URL(route.request().url());
    const query = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    const limit = Number(url.searchParams.get('limit') ?? 20);
    const items = query.length >= 2 ? CAREER_ITEMS : [];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(toEnvelope({
        query,
        limit,
        items,
      })),
    });
  });
}

async function bootstrapHarness(page: Page) {
  await mockSessionApis(page);
  await mockNotificationsApis(page);
  await mockDashboardAnalysisApis(page);
  await mockComposerSearchApis(page);

  await page.addInitScript((session) => {
    window.localStorage.setItem('sigase.auth.user', JSON.stringify(session));
  }, ADMIN_SESSION);

  const initialPost = waitForDashboardAnalysisPost(page);
  await page.goto('/admin/monitoreo-reportes');
  await page.waitForURL(/\/admin\/monitoreo-reportes/);
  await initialPost;
  await expect(page.getByText('Monitoreo y Reportes')).toBeVisible();
}

function composerDialog(page: Page): Locator {
  return page.locator('[role="dialog"]').filter({
    has: page.getByText('Compositor de análisis', { exact: true }),
  }).first();
}

async function ensureComposerOpen(page: Page): Promise<Locator> {
  const dialog = composerDialog(page);
  const visible = await dialog.isVisible().catch(() => false);
  if (!visible) {
    await page.getByTestId('open-dashboard-composer').click();
  }
  await expect(dialog).toBeVisible();
  return dialog;
}

async function selectByLabel(page: Page, dialog: Locator, label: string, optionLabel: string) {
  const trigger = dialog
    .getByText(label, { exact: true })
    .first()
    .locator('xpath=following::button[@role="combobox"][1]');

  await expect(trigger).toBeVisible();
  await trigger.click();
  await page.getByRole('option', { name: optionLabel, exact: true }).click();
}

async function setSwitchByLabel(dialog: Locator, label: string, enabled: boolean) {
  const control = dialog
    .getByText(label, { exact: true })
    .first()
    .locator('xpath=following::button[@role="switch"][1]');

  await expect(control).toBeVisible();
  const isChecked = (await control.getAttribute('aria-checked')) === 'true';
  if (isChecked !== enabled) {
    await control.click();
  }
}

async function selectStudent(dialog: Locator) {
  const input = dialog.getByPlaceholder('Escribe al menos 2 caracteres…');
  await input.fill('ad');

  const option = dialog.getByRole('button').filter({
    hasText: STUDENT_ITEM.displayLabel,
  }).first();

  await expect(option).toBeVisible();
  await option.click();
}

async function selectCareers(dialog: Locator, count: 1 | 2) {
  const input = dialog.getByPlaceholder('Escribe al menos 2 caracteres…');
  const targets = CAREER_ITEMS.slice(0, count);

  for (const career of targets) {
    await input.fill('in');
    const option = dialog.getByRole('button').filter({
      hasText: career.displayLabel,
    }).first();
    await expect(option).toBeVisible();
    await option.click();
  }
}

async function selectDateRangeLast7Days(page: Page, dialog: Locator) {
  await dialog.getByRole('button', { name: 'Abrir calendario' }).click();

  const calendarPanel = page.locator('div').filter({
    hasText: 'Selección rápida',
  }).filter({
    hasText: 'Histórico disponible desde',
  }).first();

  await expect(calendarPanel).toBeVisible();
  await calendarPanel.getByRole('button', { name: 'Últimos 7 días', exact: true }).click({ force: true });
  await calendarPanel.getByRole('button', { name: 'Aplicar', exact: true }).click();
}

test.describe('dashboard composer filter matrix', () => {
  test('covers all valid filter combinations (204) and validates request mapping', async ({ page }) => {
    test.setTimeout(12 * 60 * 1000);
    expect(SCENARIOS).toHaveLength(204);
    await page.setViewportSize({ width: 1800, height: 1400 });

    const requestedLimit = Number(process.env.COMPOSER_V3_CASE_LIMIT ?? SCENARIOS.length);
    const boundedLimit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(SCENARIOS.length, Math.floor(requestedLimit)))
      : SCENARIOS.length;
    const activeScenarios = SCENARIOS.slice(0, boundedLimit);

    await bootstrapHarness(page);

    for (const scenario of activeScenarios) {
      await test.step(`[${scenario.id}] ${scenario.name}`, async () => {
        const dialog = await ensureComposerOpen(page);

        const resetPost = waitForDashboardAnalysisPost(page);
        await dialog.getByRole('button', { name: 'Reset', exact: true }).click();
        await resetPost;

        await selectByLabel(
          page,
          dialog,
          'Tipo',
          scenario.filterType === 'alumno' ? 'Alumno' : 'Carrera',
        );
        await selectByLabel(page, dialog, 'Alcance', SCOPE_LABELS[scenario.scope]);

        if (scenario.filterType === 'alumno' && scenario.scope === 'individual') {
          await selectStudent(dialog);
        }

        if (scenario.filterType === 'carrera' && scenario.selectedCareerCount > 0) {
          await selectCareers(dialog, scenario.selectedCareerCount);
        }

        await selectByLabel(page, dialog, 'Tipo de acceso', ACCESS_LABELS[scenario.accessType]);

        await setSwitchByLabel(dialog, 'Fecha', scenario.dateEnabled);
        if (scenario.dateEnabled) {
          await selectDateRangeLast7Days(page, dialog);
        }

        if (scenario.filterType === 'alumno' && scenario.scope === 'todos') {
          await setSwitchByLabel(dialog, 'Ranking', scenario.rankingEnabled);
        }

        if (scenario.topN !== null) {
          await selectByLabel(page, dialog, 'Top N', `Top ${scenario.topN}`);
        }

        if (shouldShowSortOrder(scenario)) {
          await selectByLabel(page, dialog, 'Orden', SORT_LABELS[scenario.sortOrder]);
        }

        const applyButton = dialog.getByRole('button', { name: 'Aplicar', exact: true });
        await expect(applyButton).toBeEnabled();
        const applyPost = waitForDashboardAnalysisPost(page);
        await applyButton.click();
        const captured = await applyPost;
        await expect(dialog).not.toBeVisible();

        const expected = buildExpectedRequest(scenario);
        const actual = parseAnalysisPostBody(captured.postData());

        expect(actual.scope).toBe(expected.scope);
        expect(actual.mode).toBe(expected.mode);
        expect(actual.studentId).toBe(expected.studentId);
        expect(actual.careerIds).toEqual(expected.careerIds);
        expect(actual.accessResult).toBe(expected.accessResult);
        expect(actual.dateFilterType).toBe(expected.dateFilterType);
        expect(actual.rankingMode).toBe(expected.rankingMode);
        expect(actual.topN).toBe(expected.topN);
        expect(actual.sortDirection).toBe(expected.sortDirection);
        expect(actual.widgetControls).toBeNull();

        if (scenario.dateEnabled) {
          expect(actual.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}T/);
          expect(actual.dateTo).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        } else {
          expect(actual.dateFrom).toBeNull();
          expect(actual.dateTo).toBeNull();
        }
      });
    }
  });
});
