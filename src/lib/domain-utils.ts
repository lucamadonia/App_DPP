/**
 * Domain-Validierung und Hilfsfunktionen für Whitelabeling
 */

/**
 * Validiert ob ein String ein gültiges Domain-Format hat.
 * Erlaubt: example.com, sub.example.com, dpp.firma.de
 * Nicht erlaubt: https://example.com, example, example.com/path
 */
export function isValidDomain(domain: string): boolean {
  if (!domain || domain.trim() === '') {
    return false;
  }

  // Domain-Regex: Erlaubt Subdomains, mindestens 2 Zeichen TLD
  const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(domain.trim());
}

/**
 * Bereinigt einen Domain-String von unerwünschten Zeichen.
 * Entfernt: Protokoll (https://), trailing slash, Leerzeichen
 */
export function normalizeDomain(input: string): string {
  if (!input) return '';

  return input
    .trim()
    .replace(/^https?:\/\//, '') // Entferne Protokoll
    .replace(/\/+$/, '')          // Entferne trailing slashes
    .toLowerCase();               // Kleinschreibung
}

/**
 * Validiert und gibt ein normalisiertes Ergebnis zurück
 */
export interface DomainValidationResult {
  isValid: boolean;
  normalizedDomain: string;
  errorMessage?: string;
}

export function validateDomain(input: string): DomainValidationResult {
  const normalized = normalizeDomain(input);

  if (!normalized) {
    return {
      isValid: false,
      normalizedDomain: '',
      errorMessage: 'Bitte geben Sie eine Domain ein',
    };
  }

  if (!isValidDomain(normalized)) {
    // Spezifischere Fehlermeldungen
    if (normalized.includes(' ')) {
      return {
        isValid: false,
        normalizedDomain: normalized,
        errorMessage: 'Domain darf keine Leerzeichen enthalten',
      };
    }
    if (normalized.includes('/')) {
      return {
        isValid: false,
        normalizedDomain: normalized,
        errorMessage: 'Bitte nur die Domain ohne Pfad eingeben (z.B. dpp.firma.de)',
      };
    }
    if (!normalized.includes('.')) {
      return {
        isValid: false,
        normalizedDomain: normalized,
        errorMessage: 'Domain muss mindestens eine Subdomain haben (z.B. dpp.firma.de)',
      };
    }

    return {
      isValid: false,
      normalizedDomain: normalized,
      errorMessage: 'Ungültiges Domain-Format. Beispiel: dpp.meinefirma.de',
    };
  }

  return {
    isValid: true,
    normalizedDomain: normalized,
  };
}

/**
 * Validiert einen optionalen Pfad-Präfix
 */
export function validatePathPrefix(input: string): { isValid: boolean; normalized: string; errorMessage?: string } {
  if (!input || input.trim() === '') {
    return { isValid: true, normalized: '' };
  }

  // Entferne führende/trailing slashes und bereinige
  const normalized = input
    .trim()
    .replace(/^\/+|\/+$/g, '') // Entferne führende/trailing slashes
    .replace(/\/+/g, '/');      // Ersetze mehrfache slashes

  // Erlaubt: alphanumerisch, Bindestriche, einzelne Slashes
  const pathRegex = /^[a-zA-Z0-9-]+(\/[a-zA-Z0-9-]+)*$/;

  if (!pathRegex.test(normalized)) {
    return {
      isValid: false,
      normalized,
      errorMessage: 'Pfad darf nur Buchstaben, Zahlen und Bindestriche enthalten',
    };
  }

  return { isValid: true, normalized };
}

/**
 * Baut eine vollständige URL aus den Komponenten zusammen
 */
export function buildDomainUrl(options: {
  domain: string;
  useHttps: boolean;
  pathPrefix?: string;
  gtin?: string;
  serial?: string;
}): string {
  const { domain, useHttps, pathPrefix, gtin, serial } = options;

  const protocol = useHttps ? 'https' : 'http';
  const normalizedDomain = normalizeDomain(domain);
  const prefix = pathPrefix ? `/${pathPrefix.replace(/^\/|\/$/g, '')}` : '';

  let url = `${protocol}://${normalizedDomain}${prefix}`;

  if (gtin && serial) {
    url += `/p/${gtin}/${serial}`;
  }

  return url;
}
