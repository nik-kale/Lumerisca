/**
 * React Error Boundary Component
 * Catches and handles React errors gracefully
 */

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Wraps components to catch and display errors gracefully
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("ErrorBoundary caught error:", error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({ error, errorInfo });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <DefaultErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

/**
 * Default error fallback UI
 */
function DefaultErrorFallback({
  error,
  onReset,
}: {
  error: Error | null;
  onReset: () => void;
}): JSX.Element {
  return (
    <div
      style={{
        padding: "24px",
        background: "#0b1120",
        color: "#e5e7eb",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          maxWidth: "400px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "48px",
            marginBottom: "16px",
          }}
        >
          ⚠️
        </div>

        <h2
          style={{
            fontSize: "20px",
            fontWeight: 600,
            marginBottom: "12px",
          }}
        >
          Something went wrong
        </h2>

        <p
          style={{
            fontSize: "14px",
            color: "#9ca3af",
            marginBottom: "24px",
            lineHeight: "1.5",
          }}
        >
          {error?.message || "An unexpected error occurred. Please try again."}
        </p>

        <button
          onClick={onReset}
          style={{
            padding: "12px 24px",
            background: "#3b82f6",
            border: "none",
            borderRadius: "8px",
            color: "#e5e7eb",
            fontSize: "14px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Try Again
        </button>

        <div
          style={{
            marginTop: "24px",
            padding: "16px",
            background: "#1f2937",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#6b7280",
            textAlign: "left",
          }}
        >
          <details>
            <summary style={{ cursor: "pointer", marginBottom: "8px" }}>
              Error Details
            </summary>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: "11px",
              }}
            >
              {error?.stack || "No stack trace available"}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundary;
