'use client';

import React, { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  /**
   * When true, automatically reset the error state so children remount
   * instead of permanently showing the fallback. Useful for transient DOM
   * errors caused by browser extensions or auto-translate modifying the DOM.
   */
  recoverable?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);

    if (this.props.recoverable) {
      // Schedule a reset so the children remount on the next frame.
      // This recovers from transient DOM corruption (e.g. Chrome translate
      // wrapping text nodes in <font> tags, causing removeChild errors).
      requestAnimationFrame(() => {
        this.setState({ hasError: false });
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
