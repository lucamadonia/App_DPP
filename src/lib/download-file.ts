/**
 * File hand-off that works in a WebView.
 *
 * `<a download>` is a browser affordance, not a web-platform guarantee. Inside
 * a Capacitor WebView it is unreliable: WKWebView ignores the attribute for
 * blob:/data: hrefs entirely, and Android's WebView only honours it when the
 * host app has wired up a DownloadListener — which Capacitor does not. The
 * click silently no-ops, so a user taps "Download PDF" and nothing whatsoever
 * happens. No error, no file.
 *
 * On native the correct move is to write the bytes into the app's cache
 * directory and hand the URI to the OS share sheet, which is also what people
 * actually want on a phone: the file goes to Files, Drive, Mail or WhatsApp
 * rather than into a downloads folder they will never open.
 *
 * The web path is byte-for-byte the behaviour that shipped before this module
 * existed, so migrating a call site cannot regress the browser build.
 */
import { isNative } from './platform';

/** Anything a caller realistically already has in hand. */
export type DownloadableContent = Blob | string;

export interface SaveOrShareOptions {
  /** Filename including extension. Also the share-sheet title on native. */
  filename: string;
  /** MIME type. Used for the Blob on web and for the share sheet on native. */
  mime: string;
  /**
   * Content. A `data:` URL is decoded to its bytes; any other string is treated
   * as text (SVG markup, CSV, JSON); a Blob is used as-is.
   */
  content: DownloadableContent;
  /** Share-sheet dialog title on native. Ignored on web. */
  shareTitle?: string;
}

/** True for `data:<mime>[;base64],<payload>`. */
function isDataUrl(value: string): boolean {
  return /^data:[^,]*,/.test(value);
}

function toBlob(content: DownloadableContent, mime: string): Blob {
  if (content instanceof Blob) return content;
  if (isDataUrl(content)) {
    const comma = content.indexOf(',');
    const meta = content.slice(5, comma);
    const payload = content.slice(comma + 1);
    if (/;base64$/i.test(meta)) {
      const binary = atob(payload);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      return new Blob([bytes], { type: meta.replace(/;base64$/i, '') || mime });
    }
    return new Blob([decodeURIComponent(payload)], { type: meta || mime });
  }
  return new Blob([content], { type: mime });
}

/** Base64 WITHOUT the `data:` prefix — the shape Capacitor Filesystem expects. */
async function toBase64(content: DownloadableContent, mime: string): Promise<string> {
  if (typeof content === 'string' && isDataUrl(content)) {
    const comma = content.indexOf(',');
    if (/;base64$/i.test(content.slice(5, comma))) return content.slice(comma + 1);
  }
  const blob = toBlob(content, mime);
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

function downloadInBrowser(options: SaveOrShareOptions): void {
  const url = URL.createObjectURL(toBlob(options.content, options.mime));
  const a = document.createElement('a');
  a.href = url;
  a.download = options.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoking synchronously can race the navigation Chrome starts on click.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Save a generated file, or hand it to the OS share sheet on native.
 *
 * Rejects if the file could not be handed off, so callers can surface a toast
 * instead of leaving the user staring at a button that did nothing.
 */
export async function saveOrShare(options: SaveOrShareOptions): Promise<void> {
  if (!isNative()) {
    downloadInBrowser(options);
    return;
  }

  // Imported lazily so the web bundle never pulls in the native plugins.
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ]);

  const data = await toBase64(options.content, options.mime);

  // Cache, not Documents: these are throwaway exports the user is about to send
  // somewhere else, and Cache is the one directory the OS may reclaim on its own.
  const written = await Filesystem.writeFile({
    path: options.filename,
    directory: Directory.Cache,
    data,
    recursive: true,
  });

  await Share.share({
    title: options.shareTitle ?? options.filename,
    files: [written.uri],
  });
}

/**
 * Whether the current platform can hand a generated file to the user at all.
 *
 * Printing is the one thing that has no native equivalent — `window.print()`
 * resolves to nothing inside a WebView — so print buttons should be hidden
 * rather than left to fail silently.
 */
export function canPrint(): boolean {
  return !isNative();
}
