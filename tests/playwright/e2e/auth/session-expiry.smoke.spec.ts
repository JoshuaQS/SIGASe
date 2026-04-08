import { expect, test } from '@playwright/test';
import { seedExpiredAdminSession } from '@helpers/smoke/admin-smoke';

test.describe('AUD-013 session expiry smoke', () => {
  test('shows the session-expired dialog and returns to login when /me rejects with SESSION_EXPIRED', async ({ page }) => {
    await seedExpiredAdminSession(page);

    await page.route('**/api/v1/auth/admin/me', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'SESSION_EXPIRED',
          message: 'Tu sesión ha expirado por inactividad',
        }),
      });
    });

    await page.goto('/admin/monitoreo-reportes');

    await expect(page.getByText('Sesión Expirada')).toBeVisible();
    await expect(page.getByText('Tu sesión ha expirado por inactividad')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);

    const storedSession = await page.evaluate(() => window.localStorage.getItem('sigase.auth.user'));
    expect(storedSession).toBeNull();
  });
});
