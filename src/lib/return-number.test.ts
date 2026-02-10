import { describe, it, expect } from 'vitest'
import { generateReturnNumber, generateTicketNumber } from './return-number'

describe('generateReturnNumber', () => {
  it('returns a string matching format PREFIX-YYYYMMDD-XXXXX', () => {
    const result = generateReturnNumber()
    expect(result).toMatch(/^RET-\d{8}-[A-Z0-9]{4}\d$/)
  })

  it('uses default prefix RET', () => {
    const result = generateReturnNumber()
    expect(result).toMatch(/^RET-/)
  })

  it('uses custom prefix when provided', () => {
    const result = generateReturnNumber('RTN')
    expect(result).toMatch(/^RTN-/)
  })

  it('contains todays date in YYYYMMDD format', () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const expectedDate = `${year}${month}${day}`

    const result = generateReturnNumber()
    expect(result).toContain(expectedDate)
  })

  it('generates unique numbers on consecutive calls', () => {
    const results = new Set<string>()
    for (let i = 0; i < 100; i++) {
      results.add(generateReturnNumber())
    }
    // With 4 random chars from 30-char alphabet, collisions in 100 are extremely unlikely
    expect(results.size).toBe(100)
  })

  it('ends with a single digit (Luhn check digit)', () => {
    const result = generateReturnNumber()
    const lastChar = result[result.length - 1]
    expect(lastChar).toMatch(/\d/)
  })

  it('random part uses only readable characters (no 0, O, 1, I)', () => {
    // Generate many to statistically check
    for (let i = 0; i < 50; i++) {
      const result = generateReturnNumber()
      const randomPart = result.split('-')[2].slice(0, 4) // first 4 chars are random
      expect(randomPart).not.toMatch(/[01OI]/)
    }
  })
})

describe('generateTicketNumber', () => {
  it('returns a string matching format PREFIX-YYYYMMDD-XXXXX', () => {
    const result = generateTicketNumber()
    expect(result).toMatch(/^TKT-\d{8}-[A-Z0-9]{4}\d$/)
  })

  it('uses default prefix TKT', () => {
    const result = generateTicketNumber()
    expect(result).toMatch(/^TKT-/)
  })

  it('uses custom prefix when provided', () => {
    const result = generateTicketNumber('SUP')
    expect(result).toMatch(/^SUP-/)
  })

  it('generates unique numbers on consecutive calls', () => {
    const results = new Set<string>()
    for (let i = 0; i < 100; i++) {
      results.add(generateTicketNumber())
    }
    expect(results.size).toBe(100)
  })
})
