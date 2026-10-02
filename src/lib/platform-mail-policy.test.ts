import { describe, expect, it } from 'vitest';
import {
  freeTierPlainBody,
  htmlToPlainText,
  platformDisplayName,
} from '../../supabase/functions/_shared/platform-mail-policy';

describe('free-tier platform mail policy (EF-07)', () => {
  it('flattens HTML and exposes real link targets', () => {
    const html = '<html><head><style>.x{}</style><title>t</title></head><body>'
      + '<p>Hallo&nbsp;M&auml;x,</p><a href="https://evil.example/login">https://paypal.com</a>'
      + '<script>alert(1)</script><img src="https://evil.example/logo.png" alt="PayPal"></body></html>';
    const text = htmlToPlainText(html);
    expect(text).toContain('Hallo Mäx,');
    expect(text).toContain('https://paypal.com (https://evil.example/login)');
    expect(text).not.toMatch(/<|alert|\.x\{/);
    expect(text).toContain('PayPal');
  });

  it('drops non-http link schemes', () => {
    expect(htmlToPlainText('<a href="javascript:alert(1)">Click</a>')).toBe('Click');
    expect(htmlToPlainText("<a href='data:text/html,x'>Go</a>")).toBe('Go');
  });

  it('keeps block structure as newlines', () => {
    expect(htmlToPlainText('<div>a</div><div>b</div><ul><li>c</li></ul>')).toBe('a\nb\n- c');
  });

  it('forces the display name and footer', () => {
    expect(platformDisplayName('PayPal "Security" <x@y>')).toBe('PayPal Security x y via Trackbliss');
    expect(platformDisplayName('')).toBe('Trackbliss');
    const body = freeTierPlainBody('<b>Hi</b>', true, 'Acme', 'de');
    expect(body.startsWith('Hi\n\n--\n')).toBe(true);
    expect(body).toContain('"Acme" über die Plattform Trackbliss');
    expect(freeTierPlainBody('plain', false, 'Acme', 'en')).toContain('sent by "Acme" via the Trackbliss platform');
  });
});
