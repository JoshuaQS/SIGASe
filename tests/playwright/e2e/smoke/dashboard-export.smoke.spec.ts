import { expect, test } from '@playwright/test';
import { loginAsAdmin, mockDashboardApis } from '@helpers/smoke/admin-smoke';

test.describe('AUD-013 dashboard export smoke', () => {
  test('applies a dashboard quick filter and exports the same scope', async ({ page }) => {
    await mockDashboardApis(page);
    await loginAsAdmin(page);

    await expect(page.getByRole('heading', { name: 'Monitoreo y Reportes' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Accesos totales del rango' })).toBeVisible();

    const filteredSummaryResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.endsWith('/api/v1/dashboard/summary')
        && url.searchParams.get('analysisType') === 'students_all'
        && url.searchParams.get('status') === 'SUCCESS';
    });

    await page.getByRole('button', { name: 'Accesos Exitosos estudiantes' }).click();
    await page.getByRole('button', { name: 'Filtrar' }).click();
    await filteredSummaryResponse;

    await expect(page.getByText('Resultados filtrados')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Serie temporal de accesos exitosos' })).toBeVisible();

    const exportDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar filtrados' }).first().click();
    await page.getByRole('button', { name: 'Descargar CSV' }).click();

    const download = await exportDownload;
    expect(download.suggestedFilename()).toBe('dashboard-monitoring.csv');
  });
});
