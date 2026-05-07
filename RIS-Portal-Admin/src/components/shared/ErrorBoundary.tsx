import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Custom fallback rendered instead of the default error UI */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * IEC 62304 §7.4.4 — catches unhandled React render errors and renders a
 * recovery UI instead of a blank screen. Errors are surfaced to the user
 * so they can take corrective action (reload / return to dashboard).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production this should route to a structured error-reporting service.
    // Never log PHI — only structural error data.
    const report = {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
      timestamp: new Date().toISOString(),
    };
    // eslint-disable-next-line no-console
    console.error('[RIS Admin] Unhandled render error', report);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center"
      >
        <div className="p-3 bg-danger-50 rounded-full">
          <AlertTriangle size={28} className="text-danger-600" />
        </div>
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--color-text)] mb-1">
            An unexpected error occurred
          </h2>
          <p className="text-[12px] text-[var(--color-text-muted)] max-w-sm">
            The application encountered an error. Your data has not been affected.
          </p>
        </div>
        <p className="text-[11px] font-mono text-danger-600 bg-danger-50 px-3 py-1.5 rounded max-w-md break-all">
          {error.message}
        </p>
        <div className="flex gap-2">
          <button
            onClick={this.reset}
            className="px-4 py-2 text-[13px] bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.replace('/admin/dashboard')}
            className="px-4 py-2 text-[13px] border border-[var(--color-border)] hover:bg-[var(--color-border)] rounded-md transition-colors"
          >
            Return to dashboard
          </button>
        </div>
      </div>
    );
  }
}
