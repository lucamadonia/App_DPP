import * as React from "react"

const MOBILE_BREAKPOINT = 768

function readMatches(breakpoint: number): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches
}

/**
 * Viewport-width check for *behavioural* branches — i.e. deciding which
 * component tree to mount (Sheet vs Dialog, cards vs table).
 *
 * For pure layout differences prefer Tailwind's `md:` variants: they are
 * resolved by CSS before the first paint and cost no JS.
 *
 * The initial state is read synchronously from matchMedia so the first render
 * is already correct — previously it started `undefined`, which rendered one
 * desktop frame on every mobile load.
 */
export function useIsMobile(breakpoint = MOBILE_BREAKPOINT): boolean {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => readMatches(breakpoint))

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener("change", onChange)
    // Re-sync in case the viewport changed between first render and effect.
    setIsMobile(mql.matches)
    return () => mql.removeEventListener("change", onChange)
  }, [breakpoint])

  return isMobile
}
