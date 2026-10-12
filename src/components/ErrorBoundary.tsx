import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("Alto render error:", error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="page">
          <div className="container">
            <div className="card">
              <h2>Something went wrong. Please refresh the page.</h2>
            </div>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
