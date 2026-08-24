import { useLocation, useNavigationType } from 'react-router-dom';

export type NavDirection = 'push' | 'pop' | 'switch';

export interface NavDepth {
  /** Number of path segments; '/' is 0. */
  depth: number;
  /** Whether a contextual back affordance makes sense here. */
  canGoBack: boolean;
  /** How we arrived at the current route. */
  direction: NavDirection;
  /** Parent path derived from the URL, or null at a root. */
  parentPath: string | null;
}

function segmentDepth(pathname: string): number {
  return pathname.split('/').filter(Boolean).length;
}

function parentOf(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length <= 1) return null;
  return '/' + parts.slice(0, -1).join('/');
}

/**
 * Navigation depth and direction, used to choose the route transition (push
 * slides in from the right, pop mirrors it, a lateral tab change crossfades)
 * and to decide whether the header shows a back arrow.
 *
 * Direction comes from the router's own history action rather than from a
 * remembered previous pathname: that is the real semantic, needs no ref (which
 * may not be read during render), and stays correct after a deep link or a
 * hard reload — exactly the native cold-start case.
 *
 * Depth comes from path segments rather than history length, which is
 * unreliable for the same reason.
 */
export function useNavDepth(): NavDepth {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  const depth = segmentDepth(pathname);

  let direction: NavDirection;
  if (navigationType === 'POP') direction = 'pop';
  else if (depth > 1) direction = 'push';
  else direction = 'switch'; // top-level route = lateral tab change

  return {
    depth,
    canGoBack: depth > 1,
    direction,
    parentPath: parentOf(pathname),
  };
}
