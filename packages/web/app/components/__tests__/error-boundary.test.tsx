import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import ErrorBoundary from '../error-boundary';

// Suppress React error boundary console noise in tests
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

const AlwaysThrow = () => {
  throw new Error('persistent error');
};

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>hello</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('hello')).toBeDefined();
  });

  it('renders fallback on error', () => {
    render(
      <ErrorBoundary fallback={<div>oops</div>}>
        <AlwaysThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText('oops')).toBeDefined();
  });

  it('renders nothing when error and no fallback', () => {
    const { container } = render(
      <ErrorBoundary>
        <AlwaysThrow />
      </ErrorBoundary>,
    );
    expect(container.innerHTML).toBe('');
  });

  describe('recoverable mode', () => {
    it('auto-resets after a transient error', async () => {
      let shouldThrow = true;

      const Conditional = () => {
        if (shouldThrow) throw new Error('transient');
        return <div>recovered</div>;
      };

      render(
        <ErrorBoundary recoverable>
          <Conditional />
        </ErrorBoundary>,
      );

      // Error caught, fallback rendered (null)
      expect(screen.queryByText('recovered')).toBeNull();

      // Fix the error before the rAF fires
      shouldThrow = false;

      // Flush the requestAnimationFrame that triggers recovery
      await act(async () => {
        await new Promise((r) => requestAnimationFrame(r));
      });

      expect(screen.getByText('recovered')).toBeDefined();
    });

    it('stops retrying after max attempts', async () => {
      const { container } = render(
        <ErrorBoundary recoverable fallback={<div>gave up</div>}>
          <AlwaysThrow />
        </ErrorBoundary>,
      );

      // Flush multiple rAF cycles (more than the 3 retry limit)
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          await new Promise((r) => requestAnimationFrame(r));
        });
      }

      // Should have given up and show the fallback permanently
      expect(screen.getByText('gave up')).toBeDefined();
      expect(container.querySelector('[data-testid="recovered"]')).toBeNull();
    });

    it('does not auto-reset when recoverable is false', async () => {
      render(
        <ErrorBoundary fallback={<div>stuck</div>}>
          <AlwaysThrow />
        </ErrorBoundary>,
      );

      expect(screen.getByText('stuck')).toBeDefined();

      // Flush rAF
      await act(async () => {
        await new Promise((r) => requestAnimationFrame(r));
      });

      // Still stuck on fallback
      expect(screen.getByText('stuck')).toBeDefined();
    });
  });
});
