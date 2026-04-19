import { test, expect } from '@playwright/test';
import { LoginPage } from '@pages/auth/login.page';

test.describe('Admin Login', () => {
    let loginPage: LoginPage;

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto();
    });

    test('should login successfully with valid credentials', async ({ page }) => {
        
        await loginPage.login('admin.ti@utez.edu.mx', 'ChangeMe123!');
        
        // Wait for redirection - assuming it goes to /admin or /dashboard
        await expect(page).toHaveURL(/.*admin.*/);
    });

    test('should show error with invalid credentials', async ({ page }) => {
        await loginPage.login('wrong@email.com', 'WrongPass123');
        
        await expect(loginPage.errorMessage).toBeVisible();
        const errorMessage = await loginPage.getErrorMessage();
        // Assuming some error message structure
        expect(errorMessage).toBeTruthy();
    });

    test('should handle empty fields', async ({ page }) => {
        // Just clicking submit without filling
        await loginPage.submit();
        
        // Check for validation - browser native or custom?
        // If it's custom, it might show an error
        await expect(loginPage.errorMessage).toBeVisible();
    });

    test('should show loading state while submitting', async ({ page }) => {
        // Intercept network and delay response to check UI state
        // assuming login endpoint is /api/auth/login
        await page.route('**/api/auth/login', async (route) => {
            await new Promise(resolve => setTimeout(resolve, 2000));
            await route.continue();
        });

        await loginPage.login('admin@sigase.com', 'Admin123!');
        
        // Check if button is disabled or has loading attribute
        await expect(loginPage.submitButton).toBeDisabled();
        // and/or check if we can no longer interact with inputs
        await expect(loginPage.emailInput).toBeDisabled();
    });
});
