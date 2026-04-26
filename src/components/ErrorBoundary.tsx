import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * After a Vercel deploy, browser tabs that opened the old index.html still
 * reference chunk file names that no longer exist on the CDN. The first
 * lazy import they trigger throws "Failed to fetch dynamically imported module".
 *
 * Vite emits a `vite:preloadError` event for exactly this case. We intercept it
 * once per session and do a soft reload — the user gets a fresh index.html with
 * the new chunk hashes and never sees the broken-page flash.
 */
function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Loading chunk') && msg.includes('failed')
  );
}

/** Idempotent: only ever reload once per page life. */
let didReloadForChunkError = false;
function reloadOnceForChunkError() {
  if (didReloadForChunkError) return;
  didReloadForChunkError = true;
  // Use replace() so reload bypasses the back-stack
  window.location.reload();
}

if (typeof window !== 'undefined') {
  // Vite's purpose-built event
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    reloadOnceForChunkError();
  });

  // Catch-all for unhandled promise rejections that match
  window.addEventListener('unhandledrejection', (event) => {
    if (isChunkLoadError(event.reason)) {
      event.preventDefault();
      reloadOnceForChunkError();
    }
  });
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function ErrorFallbackContent({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  const { t } = useTranslation('common');

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-foreground">
          {t('Something went wrong')}
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          {t('An unexpected error occurred. Please try again.')}
        </p>
        {error && (
          <pre className="mb-6 max-h-32 overflow-auto rounded-md bg-muted p-3 text-left text-xs text-muted-foreground">
            {error.message}
          </pre>
        )}
        <div className="flex gap-3 justify-center">
          <Button onClick={onRetry}>
            {t('Try again')}
          </Button>
          <Button
            variant="outline"
            onClick={() => { window.location.href = '/'; }}
          >
            {t('Go to homepage')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Stale-deploy chunk errors → soft reload instead of showing the fallback UI.
    if (isChunkLoadError(error)) {
      reloadOnceForChunkError();
      return;
    }
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallbackContent
          error={this.state.error}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}
