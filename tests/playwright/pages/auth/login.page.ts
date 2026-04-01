import { Page, Locator } from '@playwright/test';
import { testIds } from '@helpers/selectors/test-ids';

export class LoginPage {
    readonly page: Page;
    readonly emailInput: Locator;
    readonly passwordInput: Locator;
    readonly submitButton: Locator;
    readonly errorMessage: Locator;

    constructor(page: Page) {
        this.page = page;
        this.emailInput = page.getByTestId(testIds.auth.email);
        this.passwordInput = page.getByTestId(testIds.auth.password);
        this.submitButton = page.getByTestId(testIds.auth.submit);
        this.errorMessage = page.getByTestId(testIds.auth.error);
    }

    async goto() {
        await this.page.goto('/login');
    }

    async fillEmail(email: string) {
        await this.emailInput.fill(email);
    }

    async fillPassword(password: string) {
        await this.passwordInput.fill(password);
    }

    async submit() {
        await this.submitButton.click();
    }

    async login(email: string, password: string) {
        await this.fillEmail(email);
        await this.fillPassword(password);
        await this.submit();
    }

    async getErrorMessage() {
        return this.errorMessage.textContent();
    }

    async isErrorMessageVisible() {
        return this.errorMessage.isVisible();
    }

    async isSubmitting() {
        // Checking for aria-disabled or just button being disabled
        const isDisabled = await this.submitButton.isDisabled();
        // Or if there's a specific loading state we want to check
        return isDisabled;
    }
}
