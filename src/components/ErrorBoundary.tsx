"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackClassName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function isChunkError(error: Error | null): boolean {
  if (!error) return false;
  return error.name === "ChunkLoadError" || error.message?.includes("Loading chunk");
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
    if (isChunkError(error)) {
      window.location.reload();
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const isStale = isChunkError(this.state.error);
      return (
        <div className={`flex flex-col items-center justify-center gap-3 py-12 px-4 text-center ${this.props.fallbackClassName || ""}`}>
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {isStale ? "New version available" : "Something went wrong"}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              {isStale
                ? "A new version was deployed. Reloading..."
                : "This section encountered an error. Try reloading or contact support if it persists."}
            </p>
          </div>
          <button
            onClick={isStale ? () => window.location.reload() : this.handleReset}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
          >
            {isStale ? "Reload now" : "Try again"}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
