import { describe, it, expect } from 'vitest'
import {
  Apple,
  Cpu,
  Package,
  Shirt,
  Stethoscope,
  UtensilsCrossed,
} from 'lucide-react'

import { getCategoryIcon } from './category-utils'

/** Stands in for a seeded `categories` row id, which carries no meaning. */
const DB_UUID = '00000000-0000-0000-0000-000000000001'

describe('getCategoryIcon', () => {
  it('resolves the slugs used by the hard-coded pickers', () => {
    expect(getCategoryIcon('electronics')).toBe(Cpu)
    expect(getCategoryIcon('textiles')).toBe(Shirt)
  })

  it('treats hyphenated and underscored ids alike', () => {
    // Both spellings occur: `food-contact` from the table, `food_supplements`
    // from the pickers.
    expect(getCategoryIcon('food-contact')).toBe(UtensilsCrossed)
    expect(getCategoryIcon('food_contact')).toBe(UtensilsCrossed)
  })

  /**
   * The database path. Seeded rows have a generated UUID and a German name,
   * so resolving on the id alone would hand every real category the generic
   * fallback — and it would still look fine locally, where the pickers supply
   * slugs.
   */
  it('falls through a meaningless id to the display name', () => {
    expect(getCategoryIcon(DB_UUID, 'Elektronik')).toBe(Cpu)
    expect(getCategoryIcon(DB_UUID, 'Medizinprodukte')).toBe(Stethoscope)
  })

  it('matches English display names too', () => {
    expect(getCategoryIcon(DB_UUID, 'Electronics & IT')).toBe(Cpu)
  })

  /**
   * Fragment order is load-bearing: "Lebensmittelkontaktmaterialien" contains
   * "lebensmittel", so the broader food fragment would swallow it if it were
   * checked first.
   */
  it('prefers the narrower name fragment over the broader one it contains', () => {
    expect(getCategoryIcon(DB_UUID, 'Lebensmittelkontaktmaterialien')).toBe(UtensilsCrossed)
    expect(getCategoryIcon(DB_UUID, 'Food Contact Materials')).toBe(UtensilsCrossed)

    // ...while the broad name still reaches the broad motif.
    expect(getCategoryIcon(DB_UUID, 'Lebensmittel & Getränke')).toBe(Apple)
  })

  it('takes the first candidate that resolves', () => {
    // A resolvable slug wins over a name that would resolve differently.
    expect(getCategoryIcon('textiles', 'Elektronik')).toBe(Shirt)
  })

  it('returns the generic icon rather than throwing on unknown or absent input', () => {
    expect(getCategoryIcon('no-such-category')).toBe(Package)
    expect(getCategoryIcon(undefined, null)).toBe(Package)
    expect(getCategoryIcon()).toBe(Package)
  })
})
