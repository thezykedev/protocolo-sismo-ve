import { expect, test } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173';

test.describe('offline navigation', () => {
  test('keeps prerendered routes working without internet', async ({ browser }) => {
    const context = await browser.newContext({
      baseURL,
    });
    const page = await context.newPage();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-offline-chip-text]')).toContainText(/Lista|Preparando|Guardando/);

    await page.goto('/contactos');
    await expect(page.locator('h1')).toHaveText('Números de emergencia');

    await page.goto('/protocolos');
    await expect(page.locator('h1')).toHaveText('Protocolos');

    await expect(page.locator('[data-offline-chip-text]')).toHaveText('Lista para usar sin internet');
    await context.setOffline(true);

    await page.goto('/contactos', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toHaveText('Números de emergencia');

    await page.goto('/protocolos', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toHaveText('Protocolos');

    await page.goto('/protocolos#durante', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#durante h2')).toHaveText('Durante el sismo');

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1').first()).toContainText('AGÁCHATE');
    await expect(page.locator('[data-offline-chip-text]')).toHaveText('Funciona sin internet');

    await context.close();
  });
});
