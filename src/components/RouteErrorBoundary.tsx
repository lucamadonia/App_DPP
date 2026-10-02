import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ErrorFallbackContent,
  isChunkLoadError,
  reloadOnceForChunkError,
} from '@/components/ErrorBoundary';

/**
 * Per-layout error boundary.
 *
 * The top-level <ErrorBoundary> in App.tsx replaces the whole application with
 * a full-screen fallback. That is the right last resort, but a single broken
 * page (a bad JSONB shape, a null the component did not expect) should not take
 * down the sidebar, the customer portal header or the returns portal branding.
 * Each layout therefore gets its own boundary, scoped to the routed content.
 *
 * The boundary resets itself whenever the pathname changes, so navigating away
 * from a broken page (sidebar link, browser back) recovers without a reload.
 */

interface InnerProps {
  children: ReactNode;
  /** Changing this value clears a caught error (the current pathname). */
  resetKey: string;
  /** Identifies the boundary in logs ("app", "public", "returns-portal", ...). */
  name: string;
  variant: 'screen' | 'section';
}

interface InnerState {
  error: Error | null;
}

export class RouteErrorBoundaryInner extends Component<InnerProps, InnerState> {
  state: InnerState = { error: null };

  static getDerivedStateFromError(error: Error): InnerState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Stale-deploy chunk errors: a reload fetches the fresh index.html.
    if (isChunkLoadError(error)) {
      reloadOnceForChunkError();
      return;
    }
    console.error(`[RouteErrorBoundary:${this.props.name}]`, error, errorInfo.componentStack);
  }

  componentDidUpdate(prevProps: InnerProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <ErrorFallbackContent
          error={this.state.error}
          onRetry={this.handleRetry}
          variant={this.props.variant}
        />
      );
    }
    return this.props.children;
  }
}

export interface RouteErrorBoundaryProps {
  children: ReactNode;
  name: string;
  /** Defaults to `screen` (wraps a whole layout); use `section` inside a layout. */
  variant?: 'screen' | 'section';
}

/** Must be rendered inside a Router (uses the pathname as reset key). */
export function RouteErrorBoundary({ children, name, variant = 'screen' }: RouteErrorBoundaryProps) {
  const { pathname } = useLocation();
  return (
    <RouteErrorBoundaryInner resetKey={pathname} name={name} variant={variant}>
      {children}
    </RouteErrorBoundaryInner>
  );
}
