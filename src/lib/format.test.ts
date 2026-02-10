import { describe, it, expect } from 'vitest'
import { formatDate, formatNumber, formatCurrency } from './format'

describe('formatDate', () => {
  it('formats a Date object with default (en) locale', () => {
    const date = new Date('2025-03-15T00:00:00Z')
    const result = formatDate(date)
    // en-US format: M/D/YYYY
    expect(result).toContain('2025')
    expect(result).toContain('3')
    expect(result).toContain('15')
  })

  it('formats a date string', () => {
    const result = formatDate('2025-06-01')
    expect(result).toBeTruthy()
    expect(result).toContain('2025')
  })

  it('formats with German locale', () => {
    const result = formatDate('2025-03-15', 'de')
    // de-DE format: DD.MM.YYYY
    expect(result).toContain('15')
    expect(result).toContain('3')
    expect(result).toContain('2025')
  })

  it('returns empty string for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('')
  })

  it('returns empty string for empty string input', () => {
    expect(formatDate('')).toBe('')
  })
})

describe('formatNumber', () => {
  it('formats integer with default (en) locale', () => {
    const result = formatNumber(1234)
    expect(result).toBe('1,234')
  })

  it('formats decimal with default (en) locale', () => {
    const result = formatNumber(1234.56)
    expect(result).toBe('1,234.56')
  })

  it('formats with German locale (dot as thousands separator)', () => {
    const result = formatNumber(1234, 'de')
    expect(result).toBe('1.234')
  })

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0')
  })

  it('formats negative numbers', () => {
    const result = formatNumber(-5000)
    expect(result).toContain('5,000')
  })
})

describe('formatCurrency', () => {
  it('formats EUR with default locale', () => {
    const result = formatCurrency(99.99)
    // en-US EUR format uses euro sign symbol
    expect(result).toContain('99.99')
    expect(result).toMatch(/€|EUR/)
  })

  it('formats EUR with German locale', () => {
    const result = formatCurrency(1234.50, 'EUR', 'de')
    expect(result).toContain('1.234')
    expect(result).toContain('50')
  })

  it('formats USD', () => {
    const result = formatCurrency(100, 'USD', 'en')
    expect(result).toContain('$')
    expect(result).toContain('100')
  })

  it('formats zero amount', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0')
  })
})
