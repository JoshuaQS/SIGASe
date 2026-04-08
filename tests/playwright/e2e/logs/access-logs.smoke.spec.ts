import { expect, test } from '@playwright/test';
import { loginAsAdmin, mockAccessLogsApis } from '@helpers/smoke/admin-smoke';

test.describe('AUD-013 access logs smoke', () => {
  test('searches and inspects a unified access log record', async ({ page }) => {
    await mockAccessLogsApis(page);
    await loginAsAdmin(page);

    await page.goto('/admin/logs-acceso');
    await expect(page.getByRole('heading', { name: 'Access Logs' })).toBeVisible();
    await expect(page.getByText('Ada Lovelace')).toBeVisible();

    const filteredResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.endsWith('/api/v1/access-logs')
        && url.searchParams.get('search') === 'REQ-1001';
    });

    await page.getByPlaceholder('Buscar por actor, correo, requestId o correlationId').fill('REQ-1001');
    await filteredResponse;

    await page.getByRole('button', { name: 'Ver' }).click();
    await expect(page.getByRole('heading', { name: 'Detalle del access log' })).toBeVisible();
    await expect(page.getByText('CorrelationId')).toBeVisible();
    await expect(page.getByText('IP saneada')).toBeVisible();
    await expect(page.getByText('10.0.0.xxx')).toBeVisible();
  });
});
