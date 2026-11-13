import type { CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Factory, Package, PackageCheck, Plane, Truck, Warehouse } from 'lucide-react';
import type { MotionBudget } from '@/hooks/use-motion-budget';

export interface SplashStageProps {
  logoSrc: string;
  budget: MotionBudget;
  active: boolean;
  showWordmark: boolean;
}

/**
 * Geometry of the logo artwork, in the 1024-unit space of splash-mark.png.
 * The overlay SVG uses the same viewBox, so these sit exactly on the pixels.
 * If the artwork is ever redrawn, these are the only numbers to re-measure
 * (plus the matching clip-path / contrail position in app-splash.css).
 */
const TRACE_PATH = 'M 478 572 L 540 655 C 600 545 700 365 872 232 L 930 196';
const VIEWFINDER_PATHS = [
  'M 57 397 L 57 345 L 105 365',
  'M 300 448 L 348 468 L 348 520',
  'M 348 773 L 348 825 L 300 805',
  'M 105 722 L 57 702 L 57 650',
];

/** The supply chain the app tracks, in order. Doubles as the load indicator. */
const CHAIN = [Factory, Warehouse, Truck, Plane, PackageCheck];

const WORDMARK = [
  ...'Track'.split('').map((char) => ({ char, accent: false })),
  ...'bliss'.split('').map((char) => ({ char, accent: true })),
];

/**
 * The launch choreography tells the product in one breath:
 * scan the code -> verified -> shipped.
 *
 *   0.1s  viewfinder locks onto the QR face, a beam sweeps it twice
 *   1.6s  light runs along the check mark and up the swoosh
 *   2.7s  it reaches the plane: logo pops, signal rings, contrail leaves
 *   0.9s+ wordmark resolves letter by letter underneath
 *   3.4s  the shipment below arrives at its last station: delivered
 *
 * Around that, the chain itself: a parcel and a plane circle the logo, and
 * under the wordmark a shipment travels factory -> warehouse -> truck ->
 * plane -> delivered. Its plane station lights as the trace reaches the
 * logo's plane, so both tellings land on the same beat.
 *
 * Everything is CSS on transform/opacity (plus one tiny stroke animation), so
 * it keeps running while React is busy mounting the app behind it. The logo
 * itself never moves before the pop — it must sit pixel-identical on top of
 * the #boot-splash image it replaces.
 */
export function SplashStage({ logoSrc, budget, active, showWordmark }: SplashStageProps) {
  const prefersReduced = useReducedMotion();
  return (
    <div
      className="app-launch-stage"
      data-active={active}
      data-budget={budget}
      data-reduced={!!prefersReduced || budget === 'reduced'}
    >
      <div className="app-launch-backdrop" aria-hidden>
        <div className="app-launch-aurora" />
        <div className="app-launch-grid" />
      </div>

      <div className="app-launch-orbit app-launch-orbit-near" aria-hidden>
        <span className="app-launch-satellite app-launch-satellite-parcel">
          <span className="app-launch-orbiter">
            <Package size={13} strokeWidth={1.75} />
          </span>
        </span>
      </div>
      <div className="app-launch-orbit app-launch-orbit-far" aria-hidden>
        <span className="app-launch-satellite app-launch-satellite-plane">
          <span className="app-launch-orbiter">
            <Plane size={15} strokeWidth={1.5} />
          </span>
        </span>
      </div>
      <div className="app-launch-ping" aria-hidden />
      <div className="app-launch-ping app-launch-ping-late" aria-hidden />

      <div className="app-launch-mark">
        <img src={logoSrc} alt="" width={160} height={160} draggable={false} />
        <span className="app-launch-scan" aria-hidden>
          <span className="app-launch-scan-beam" />
          <span className="app-launch-scan-flash" />
        </span>
        <span className="app-launch-glint" aria-hidden />
        <svg className="app-launch-overlay" viewBox="0 0 1024 1024" aria-hidden focusable="false">
          <g className="app-launch-viewfinder">
            {VIEWFINDER_PATHS.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
          <path className="app-launch-trace-tail" d={TRACE_PATH} pathLength={1} />
          <path className="app-launch-trace-head" d={TRACE_PATH} pathLength={1} />
        </svg>
        <span className="app-launch-contrail" aria-hidden />
      </div>

      {showWordmark && (
        <div className="app-launch-wordmark">
          <div className="app-launch-name">
            {WORDMARK.map(({ char, accent }, i) => (
              <span
                key={i}
                className="app-launch-letter"
                data-accent={accent}
                style={{ '--i': i } as CSSProperties}
              >
                {char}
              </span>
            ))}
          </div>
          <div className="app-launch-subtitle">
            <span>PRODUCT PASSPORT</span>
          </div>
          <div className="app-launch-chain">
            <div className="app-launch-chain-track">
              <span className="app-launch-chain-fill" />
              <span className="app-launch-chain-parcel" />
            </div>
            {CHAIN.map((Icon, i) => (
              <span key={i} className="app-launch-station" style={{ '--i': i } as CSSProperties}>
                <Icon size={17} strokeWidth={1.6} />
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
