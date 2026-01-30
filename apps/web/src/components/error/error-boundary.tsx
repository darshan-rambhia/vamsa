import { Component } from "react";
import { ErrorCard } from "./error-card";
import type { ReactNode } from "react";
import type { ErrorCardProps } from "./error-card";

interface ErrorBoundaryProps {
  /** Children to render */
  children: ReactNode;
  /** Fallback UI to render on error - if not provided, ErrorCard is used */
  fallback?:
    | ReactNode
    | ((props: { error: Error; reset: () => void }) => ReactNode);
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Props to pass to the default ErrorCard fallback */
  errorCardProps?: Partial<ErrorCardProps>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * A React Error Boundary for catching component-level errors.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * // With custom fallback
 * <ErrorBoundary fallback={<div>Something went wrong</div>}>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * // With render prop fallback
 * <ErrorBoundary fallback={({ error, reset }) => (
 *   <div>
 *     <p>Error: {error.message}</p>
 *     <button onClick={reset}>Retry</button>
 *   </div>
 * )}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    // Call onError callback if provided
    this.props.onError?.(error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const { fallback, errorCardProps } = this.props;
      const error = this.state.error;

      // Render prop fallback
      if (typeof fallback === "function") {
        return fallback({ error, reset: this.reset });
      }

      // Static fallback
      if (fallback) {
        return fallback;
      }

      // Default ErrorCard fallback
      return (
        <ErrorCard
          title="This section encountered an error"
          message="Something went wrong loading this content. Try refreshing or come back later."
          error={error}
          onRetry={this.reset}
          variant="compact"
          {...errorCardProps}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component version of ErrorBoundary
 */
export function withErrorBoundary<TProps extends object>(
  WrappedComponent: React.ComponentType<TProps>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">
) {
  return function WithErrorBoundary(props: TProps) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}
