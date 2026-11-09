import { expect, type Page } from '@playwright/test';

/** Marks the element layout checks should measure: `.app-content`, or a full-screen portal. */
export const SCREEN_ROOT = '[data-audit-root]';

/**
 * Layout measurements must not pass against an empty or fading route shell.
 *
 * Full-screen tools (scanner, stocktake) render through `createPortal` into
 * <body> as a `fixed inset-0` layer, leaving `.app-content` empty. Such a layer
 * becomes the screen root instead, tagged with `data-audit-root`.
 */
export async function waitForAppScreen(page: Page) {
  await expect(page.locator('.app-content')).toBeAttached({ timeout: 15_000 });
  await page.waitForFunction(() => {
    const main = document.querySelector<HTMLElement>('.app-content');
    if (!main) return false;
    const coversViewport = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return getComputedStyle(el).position === 'fixed' && r.width >= innerWidth - 1 && r.height >= innerHeight - 1;
    };
    let root: HTMLElement | undefined = main.innerText.trim().length >= 8 ? main : undefined;
    if (!root) {
      for (const child of Array.from(document.body.children) as HTMLElement[]) {
        const layer = coversViewport(child) ? child : (child.firstElementChild as HTMLElement | null);
        if (layer && coversViewport(layer) && layer.innerText.trim().length >= 8 && !layer.closest('#boot-splash')) { root = layer; break; }
      }
    }
    if (!root) return false;
    let element = root.querySelector<HTMLElement>('h1, h2, header, [data-slot="card"], [role="alert"]') ?? root.firstElementChild as HTMLElement | null;
    // For `.app-content` the walk stops below main (unchanged behavior); a
    // portal layer's own enter transition counts too.
    while (element && element !== main && element !== root.parentElement) {
      const style = getComputedStyle(element);
      if (Number(style.opacity) < 0.99) return false;
      if (style.transform !== 'none') {
        const matrix = new DOMMatrixReadOnly(style.transform);
        if (Math.abs(matrix.m41) > 0.5 || Math.abs(matrix.m42) > 0.5 || Math.abs(matrix.m11 - 1) > 0.001 || Math.abs(matrix.m22 - 1) > 0.001) return false;
      }
      element = element.parentElement;
    }
    document.querySelectorAll('[data-audit-root]').forEach(el => el.removeAttribute('data-audit-root'));
    root.setAttribute('data-audit-root', '');
    return true;
  }, undefined, { timeout: 15_000 });
  await expect(page.locator(`${SCREEN_ROOT} [data-slot="skeleton"]`)).toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: /^(Something went wrong|Etwas ist schiefgelaufen)$/ })).toHaveCount(0);
}
