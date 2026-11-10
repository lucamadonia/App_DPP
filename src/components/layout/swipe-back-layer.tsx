interface SwipeBackLayerProps {
  children: React.ReactNode;
}

/**
 * Wrapper around the routed content.
 *
 * The back gesture is deliberately NOT implemented in JS any more. A web-drawn
 * gesture could only slide the current page off screen over an empty backdrop,
 * because the previous route is already unmounted, so it read as the whole
 * window coming loose. Instead:
 *  - iOS app: WKWebView's native back/forward gesture (enabled in
 *    SceneDelegate.swift) shows the real previous screen underneath.
 *  - Android: the system back gesture fires Capacitor's backButton event
 *    (handled in src/lib/native-init.ts).
 *  - Mobile browsers: the browser's own edge gesture.
 *
 * The wrapper stays so layout and the `.app-swipe-content` hook are stable.
 */
export function SwipeBackLayer({ children }: SwipeBackLayerProps) {
  return <div className="app-swipe-content relative min-w-0 max-w-full">{children}</div>;
}
