import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('should load the login page', async ({ page }) => {
    await page.goto('/');
    // Assuming there's some text unique to the application
    await expect(page).toHaveTitle(/SI GASE/);
  });
});
