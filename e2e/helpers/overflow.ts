import type { Page } from '@playwright/test';

/**
 * Finds every element wider than the viewport.
 *
 * Reports the offenders rather than just failing: "something overflows" is not
 * actionable, you need to know which element. Ignores anything inside a
 * deliberate horizontal scroller (`overflow-x: auto/scroll`), since those are
 * meant to exceed their container.
 *
 * Extracted so the first-run suite can reuse it. Note the consequence for a
 * drag pager: a framer-motion track is `overflow: hidden` plus a transformed
 * child several viewports wide, which this helper does NOT skip. That is why
 * the journey pager itself is excluded from the overflow assertions rather
 * than the helper being loosened — loosening it would blind the fifteen
 * existing routes to a real class of bug.
 */
export async function findOverflowingElements(page: Page) {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const offenders: { tag: string; cls: string; width: number }[] = [];

    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
      const rect = el.getBoundingClientRect();
      if (rect.width <= viewportWidth + 1) continue;

      let parent: HTMLElement | null = el.parentElement;
      let insideScroller = false;
      while (parent && parent !== document.body) {
        const overflowX = getComputedStyle(parent).overflowX;
        if (overflowX === 'auto' || overflowX === 'scroll') {
          insideScroller = true;
          break;
        }
        parent = parent.parentElement;
      }
      if (insideScroller) continue;

      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className?.toString() ?? '').slice(0, 120),
        width: Math.round(rect.width),
      });
    }
    return { viewportWidth, offenders: offenders.slice(0, 8) };
  });
}

/**
 * Every non-inline button and link must clear 44 CSS pixels (WCAG 2.5.5).
 *
 * Returns the offenders plus whether the profile actually reports a coarse
 * pointer, because the rule under test lives behind `@media (pointer: coarse)`
 * and whether a profile reports one depends on the HOST, not just the preset.
 */
export async function findSmallTapTargets(page: Page) {
  return page.evaluate(() => {
    const coarse = matchMedia('(pointer: coarse)').matches;
    const small: { tag: string; label: string; height: number }[] = [];

    for (const el of Array.from(
      document.querySelectorAll<HTMLElement>('button, a[href], [role="tab"]')
    )) {
      const style = getComputedStyle(el);
      if (style.display === 'inline' || style.display === 'none') continue;
      const rect = el.getBoundingClientRect();
      if (rect.height === 0 && rect.width === 0) continue;
      if (rect.height >= 44) continue;
      small.push({
        tag: el.tagName.toLowerCase(),
        label: (el.textContent ?? el.getAttribute('aria-label') ?? '').trim().slice(0, 40),
        height: Math.round(rect.height * 10) / 10,
      });
    }
    return { coarse, small };
  });
}

/**
 * Requests the page made that did NOT come from the app origin or a data: URI.
 *
 * The first run has to work with no connection at all — the images ship inside
 * the APK and there is no service worker in the native build to rescue a missed
 * fetch. Asserting this turns "must work offline" from a review note into
 * something a future contributor cannot quietly break by pointing a slide at a
 * CDN.
 */
export function collectExternalRequests(page: Page, baseURL: string): string[] {
  const external: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (url.startsWith(baseURL) || url.startsWith('data:') || url.startsWith('blob:')) return;
    external.push(url);
  });
  return external;
}
