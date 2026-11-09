import type { Page } from '@playwright/test';

/** iPhone notch / home-indicator insets. `env()` is 0 in a desktop browser. */
export const SIMULATED_SAFE_AREA = { top: 47, bottom: 34 } as const;

/**
 * Pretends the page runs on a notched phone by overriding the tokens the app
 * derives from `env(safe-area-inset-*)`. `html:root` beats the plain `:root`
 * declaration in index.css regardless of stylesheet order.
 */
export async function simulateSafeArea(page: Page) {
  await page.addStyleTag({
    content: `html:root{--safe-top:${SIMULATED_SAFE_AREA.top}px;--safe-bottom:${SIMULATED_SAFE_AREA.bottom}px}`,
  });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

export interface MobileAuditResult {
  coarse: boolean;
  clippedText: string[];
  smallTapTargets: string[];
  tabBarOverlap: string[];
  safeAreaIntrusions: string[];
  smallInputs: string[];
}

/**
 * Measures the design rules a phone user notices but an overflow check misses.
 * Every finding is a human-readable "selector (size) detail" string so a failure
 * message is directly actionable without opening the trace.
 */
export async function auditMobileScreen(page: Page, opts: { safeTop: number }): Promise<MobileAuditResult> {
  return page.evaluate(async ({ safeTop }) => {
    const describe = (el: Element) => {
      const h = el as HTMLElement;
      let sel = el.tagName.toLowerCase();
      if (h.id) sel += `#${h.id}`;
      const slot = h.getAttribute('data-slot');
      if (slot) sel += `[data-slot=${slot}]`;
      const cls = (h.getAttribute('class') ?? '').split(/\s+/).filter(Boolean).slice(0, 4);
      if (cls.length) sel += '.' + cls.join('.');
      const label = h.getAttribute('aria-label') ?? (h.innerText ?? h.textContent ?? '').replace(/\s+/g, ' ').trim();
      return `${sel}${label ? ` "${label.slice(0, 40)}"` : ''}`;
    };
    const size = (r: DOMRect) => `${Math.round(r.width)}x${Math.round(r.height)}@${Math.round(r.left)},${Math.round(r.top)}`;
    const isVisible = (el: Element) => {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return false;
      const s = getComputedStyle(el);
      if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) return false;
      return !(el as HTMLElement).closest('.sr-only, [aria-hidden="true"], [hidden], [inert]');
    };
    const ownText = (el: Element) => [...el.childNodes].some(n => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim().length > 0);
    const intersects = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

    // waitForAppScreen tags the measured root (.app-content or a full-screen portal).
    const main = document.querySelector<HTMLElement>('[data-audit-root]') ?? document.querySelector<HTMLElement>('.app-content');
    const coarse = matchMedia('(pointer: coarse)').matches;
    const result = { coarse, clippedText: [] as string[], smallTapTargets: [] as string[], tabBarOverlap: [] as string[], safeAreaIntrusions: [] as string[], smallInputs: [] as string[] };
    if (!main) return result;
    main.scrollTop = 0;
    await new Promise(resolve => requestAnimationFrame(resolve));

    // (a) Text whose content is wider than its box without an intentional
    // truncation or scroll treatment: it is silently cut off or spills over.
    for (const el of main.querySelectorAll<HTMLElement>('*')) {
      if (el instanceof SVGElement || ['INPUT', 'TEXTAREA', 'SELECT', 'IMG', 'svg'].includes(el.tagName)) continue;
      if (el.scrollWidth <= el.clientWidth + 1 || !el.clientWidth || !ownText(el) || !isVisible(el)) continue;
      const s = getComputedStyle(el);
      if (['auto', 'scroll'].includes(s.overflowX)) continue;
      if (s.textOverflow === 'ellipsis' || (s.webkitLineClamp && s.webkitLineClamp !== 'none')) continue;
      if (/\b(truncate|line-clamp-\d|text-ellipsis)\b/.test(el.getAttribute('class') ?? '')) continue;
      result.clippedText.push(`${describe(el)} (${size(el.getBoundingClientRect())}, scrollWidth ${el.scrollWidth} > ${el.clientWidth}, overflow-x ${s.overflowX})`);
    }

    // (b) Touch targets below 44x44. Inline elements are text links flowing in
    // prose, which WCAG 2.5.8 exempts.
    for (const el of main.querySelectorAll<HTMLElement>('button, a[href], [role="tab"]')) {
      if (!isVisible(el)) continue;
      if (getComputedStyle(el).display === 'inline') continue;
      const r = el.getBoundingClientRect();
      // Visually small controls may carry an invisible centered ::after hit
      // area (mobile-app.css: switch, checkbox, breadcrumb-link, .touch-hit).
      const after = getComputedStyle(el, '::after');
      const hasHitArea = after.content !== 'none' && after.content !== 'normal' && after.position === 'absolute';
      const hitWidth = Math.max(r.width, hasHitArea ? parseFloat(after.width) || 0 : 0);
      const hitHeight = Math.max(r.height, hasHitArea ? parseFloat(after.height) || 0 : 0);
      if (hitWidth >= 44 && hitHeight >= 44) continue;
      result.smallTapTargets.push(`${describe(el)} (${size(r)}${hasHitArea ? `, hit area ${Math.round(hitWidth)}x${Math.round(hitHeight)}` : ''})`);
    }

    // (d) iOS zooms the page when focusing a field below 16px.
    for (const el of document.querySelectorAll<HTMLElement>('input, textarea, select, [contenteditable="true"]')) {
      if (el instanceof HTMLInputElement && ['checkbox', 'radio', 'range', 'hidden', 'file', 'color', 'submit', 'button', 'image', 'reset'].includes(el.type)) continue;
      if (!isVisible(el)) continue;
      const fontSize = parseFloat(getComputedStyle(el).fontSize);
      if (fontSize < 16) result.smallInputs.push(`${describe(el)} (${size(el.getBoundingClientRect())}, font-size ${fontSize}px)`);
    }

    // (c1) Content in the top safe area at scroll position 0: only interactive
    // or text-bearing elements count, backgrounds may extend under the notch.
    for (const el of document.body.querySelectorAll<HTMLElement>('button, a[href], input, [role="tab"], h1, h2, h3, p, span, label')) {
      if (!isVisible(el) || el.closest('[data-slot="sheet-content"], [data-slot="dialog-content"], [role="dialog"]')) continue;
      if (!el.matches('button, a[href], input, [role="tab"]') && !ownText(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.top < safeTop - 0.5 && r.bottom > 0) result.safeAreaIntrusions.push(`${describe(el)} (${size(r)})`);
    }

    // (c2) Tab bar overlap. Content may scroll beneath a fixed bar, so measure
    // (i) floating fixed/sticky elements and (ii) interactive elements still
    // under the bar once the page is scrolled fully down (= unreachable).
    const bar = document.querySelector<HTMLElement>('.app-tab-bar');
    if (bar && isVisible(bar)) {
      const barRect = bar.getBoundingClientRect();
      for (const el of document.body.querySelectorAll<HTMLElement>('*')) {
        if (bar.contains(el) || el.contains(bar) || !isVisible(el)) continue;
        const position = getComputedStyle(el).position;
        if (position !== 'fixed' && position !== 'sticky') continue;
        if (el.closest('[data-slot="sheet-content"], [data-slot="dialog-content"], [role="dialog"], [data-sonner-toaster]')) continue;
        const r = el.getBoundingClientRect();
        if (intersects(r, barRect) && r.height < barRect.top) result.tabBarOverlap.push(`fixed/sticky ${describe(el)} (${size(r)}) overlaps tab bar top ${Math.round(barRect.top)}`);
      }
      main.scrollTop = main.scrollHeight;
      window.scrollTo(0, document.documentElement.scrollHeight);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      for (const el of main.querySelectorAll<HTMLElement>('button, a[href], input, textarea, select, [role="tab"]')) {
        if (!isVisible(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.bottom > barRect.top + 1 && r.top < barRect.bottom) result.tabBarOverlap.push(`unreachable at scroll end: ${describe(el)} (${size(r)}) below tab bar top ${Math.round(barRect.top)}`);
      }
      main.scrollTop = 0;
      window.scrollTo(0, 0);
    }

    const cap = (list: string[]) => [...new Set(list)].slice(0, 25);
    return { coarse, clippedText: cap(result.clippedText), smallTapTargets: cap(result.smallTapTargets), tabBarOverlap: cap(result.tabBarOverlap), safeAreaIntrusions: cap(result.safeAreaIntrusions), smallInputs: cap(result.smallInputs) };
  }, opts);
}
