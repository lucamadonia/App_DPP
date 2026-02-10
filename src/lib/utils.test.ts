import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn (className merge utility)', () => {
  it('merges simple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
  })

  it('handles undefined and null values', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end')
  })

  it('merges tailwind classes correctly (last wins)', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })

  it('merges conflicting tailwind text colors', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('keeps non-conflicting tailwind classes', () => {
    const result = cn('p-4', 'mt-2', 'text-red-500')
    expect(result).toContain('p-4')
    expect(result).toContain('mt-2')
    expect(result).toContain('text-red-500')
  })

  it('returns empty string when called with no arguments', () => {
    expect(cn()).toBe('')
  })

  it('handles array inputs via clsx', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })

  it('handles object inputs via clsx', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })
})
