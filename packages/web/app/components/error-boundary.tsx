'use client';

import React, { Component, type ReactNode } from 'react';

const MAX_RECOVERY_ATTEMPTS = 3;

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  /**
   * When true, automatically reset the error state so children remount
   * instead of permanently showing the fallback. Useful for transient DOM
   * errors caused by browser extensions or auto-translate modifying the DOM.
   * Retries up to 3 times before falling back permanently.
   */
  recoverable?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  retryCount: number;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private rafHandle: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(): Pick<ErrorBoundaryState, 'hasError'> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);

    if (this.props.recoverable && this.state.retryCount < MAX_RECOVERY_ATTEMPTS) {
      // Schedule a reset so the children remount on the next frame.
      // This recovers from transient DOM corruption (e.g. Chrome translate
      // wrapping text nodes in <font> tags, causing removeChild errors).
      this.rafHandle = requestAnimationFrame(() => {
        this.rafHandle = null;
        this.setState((s) => ({ hasError: false, retryCount: s.retryCount + 1 }));
      });
    }
  }

  componentWillUnmount() {
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
