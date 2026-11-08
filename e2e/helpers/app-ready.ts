import { expect, type Page } from '@playwright/test';

/** Layout measurements must not pass against an empty or fading route shell. */
export async function waitForAppScreen(page: Page) {
  await expect(page.locator('.app-content')).toBeVisible({ timeout: 15_000 });
  await page.waitForFunction(() => {
    const main = document.querySelector<HTMLElement>('.app-content');
    if (!main || main.innerText.trim().length < 8) return false;
    let element = main.querySelector<HTMLElement>('h1, h2, [data-slot="card"], [role="alert"]') ?? main.firstElementChild;
    while (element && element !== main) {
      if (Number(getComputedStyle(element).opacity) < 0.99) return false;
      element = element.parentElement;
    }
    return true;
  }, undefined, { timeout: 15_000 });
  await expect(page.locator('.app-content [data-slot="skeleton"]')).toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: /^(Something went wrong|Etwas ist schiefgelaufen)$/ })).toHaveCount(0);
}
