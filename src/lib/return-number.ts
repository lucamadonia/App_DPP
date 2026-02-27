/**
 * Return Number Generator
 *
 * Generates unique return numbers with format: PREFIX-YYYYMMDD-XXXXX
 * where XXXXX is 4 random alphanumeric chars + 1 Luhn check digit
 */

function luhnCheckDigit(input: string): number {
  const digits = input.split('').map(c => {
    const code = c.charCodeAt(0);
    if (code >= 48 && code <= 57) return code - 48; // 0-9
    if (code >= 65 && code <= 90) return code - 55; // A-Z -> 10-35
    return 0;
  });

  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits[i];
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return (10 - (sum % 10)) % 10;
}

const ALPHANUMERIC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0/O/1/I for readability

function randomAlphanumeric(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)];
  }
  return result;
}

export function generateReturnNumber(prefix: string = 'RET'): string {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');

  const random = randomAlphanumeric(4);
  const check = luhnCheckDigit(random);

  return `${prefix}-${date}-${random}${check}`;
}

export function generateTicketNumber(prefix: string = 'TKT'): string {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');

  const random = randomAlphanumeric(4);
  const check = luhnCheckDigit(random);

  return `${prefix}-${date}-${random}${check}`;
}

export function generateShipmentNumber(prefix: string = 'SH'): string {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');

  const random = randomAlphanumeric(4);
  const check = luhnCheckDigit(random);

  return `${prefix}-${date}-${random}${check}`;
}

export function generateTransactionNumber(prefix: string = 'WH'): string {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');

  const random = randomAlphanumeric(4);
  const check = luhnCheckDigit(random);

  return `${prefix}-${date}-${random}${check}`;
}
