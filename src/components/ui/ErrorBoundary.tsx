import React from 'react';
import { AlertCircle } from 'lucide-react';

// ---------------------------------------------------------------------------
// ErrorBoundary
// ---------------------------------------------------------------------------

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Uncaught error:', error, info);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      const message =
        this.state.error?.message ?? 'An unexpected error occurred. Please try again.';

      return (
        <div className="flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" aria-hidden="true" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold text-red-700">Something went wrong</p>
                <p className="text-sm text-red-600">{message}</p>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={this.handleReset}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function EmptyState({ title, subtitle, icon: Icon }: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      {Icon && (
        <Icon className="h-12 w-12 text-muted-foreground opacity-40" aria-hidden="true" />
      )}
      <p className="text-base font-semibold text-gray-700">{title}</p>
      {subtitle && <p className="max-w-xs text-sm text-gray-400">{subtitle}</p>}
    </div>
  );
}
