import * as React from "react"

const MOBILE_BREAKPOINT = 768
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function readMatches(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia(MOBILE_QUERY).matches
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
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState<boolean>(readMatches)

  React.useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener("change", onChange)
    // Re-sync in case the viewport changed between first render and effect.
    setIsMobile(mql.matches)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
