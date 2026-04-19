import { Page, Locator } from '@playwright/test';

export class LoginPage {
    readonly page: Page;
    readonly emailInput: Locator;
    readonly passwordInput: Locator;
    readonly submitButton: Locator;
    readonly errorMessage: Locator;

    constructor(page: Page) {
        this.page = page;
        this.emailInput = page.getByRole('textbox', { name: 'Correo' });
        this.passwordInput = page.getByPlaceholder('Ingresa tu contraseña');
        this.submitButton = page.getByRole('button', { name: /Iniciar sesión|Ingresando\.\.\./ });
        this.errorMessage = page.locator('[role="alert"], .text-destructive').filter({ hasText: /.+/ }).first();
    }

    async goto() {
        await this.page.goto('/login?mode=admin');
        await this.page.getByRole('heading', { name: 'Acceso administrador' }).waitFor();
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
        return this.submitButton.isDisabled();
    }
}
