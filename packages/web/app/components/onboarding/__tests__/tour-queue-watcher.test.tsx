// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vite-plus/test';
import { render } from '@testing-library/react';
import React from 'react';
import TourQueueWatcher from '../tour-queue-watcher';

const { mockUseQueueList, mockUseCurrentClimb, mockUseOnboardingTourOptional } = vi.hoisted(() => ({
  mockUseQueueList: vi.fn(() => ({ queue: [] as Array<{ uuid: string }> })),
  mockUseCurrentClimb: vi.fn(() => ({ currentClimb: null as { uuid: string } | null })),
  mockUseOnboardingTourOptional: vi.fn<() => unknown>(() => null),
}));

vi.mock('@/app/components/graphql-queue', () => ({
  useQueueList: mockUseQueueList,
  useCurrentClimb: mockUseCurrentClimb,
}));

vi.mock('../onboarding-tour-provider', () => ({
  useOnboardingTourOptional: mockUseOnboardingTourOptional,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockUseQueueList.mockReturnValue({ queue: [] });
  mockUseCurrentClimb.mockReturnValue({ currentClimb: null });
  mockUseOnboardingTourOptional.mockReturnValue(null);
});

describe('TourQueueWatcher', () => {
  it('renders nothing', () => {
    const { container } = render(<TourQueueWatcher />);
    expect(container.innerHTML).toBe('');
  });

  it('is a no-op when tour provider is absent', () => {
    mockUseQueueList.mockReturnValue({ queue: [{ uuid: 'q1' }] });
    mockUseCurrentClimb.mockReturnValue({ currentClimb: { uuid: 'c1' } });
    // No tour in context — must not throw.
    expect(() => render(<TourQueueWatcher />)).not.toThrow();
  });

  it('forwards initial queue length and current climb to the tour provider on mount', () => {
    const notifyQueueLength = vi.fn();
    const notifyCurrentClimb = vi.fn();
    mockUseOnboardingTourOptional.mockReturnValue({ notifyQueueLength, notifyCurrentClimb });
    mockUseQueueList.mockReturnValue({ queue: [{ uuid: 'q1' }, { uuid: 'q2' }] });
    mockUseCurrentClimb.mockReturnValue({ currentClimb: { uuid: 'c1' } });

    render(<TourQueueWatcher />);

    expect(notifyQueueLength).toHaveBeenCalledWith(2);
    expect(notifyCurrentClimb).toHaveBeenCalledWith('c1');
  });

  it('forwards queue length changes on rerender', () => {
    const notifyQueueLength = vi.fn();
    const notifyCurrentClimb = vi.fn();
    mockUseOnboardingTourOptional.mockReturnValue({ notifyQueueLength, notifyCurrentClimb });
    mockUseQueueList.mockReturnValue({ queue: [] });
    mockUseCurrentClimb.mockReturnValue({ currentClimb: null });

    const { rerender } = render(<TourQueueWatcher />);
    notifyQueueLength.mockClear();

    mockUseQueueList.mockReturnValue({ queue: [{ uuid: 'q1' }] });
    rerender(<TourQueueWatcher />);
    expect(notifyQueueLength).toHaveBeenCalledWith(1);

    notifyQueueLength.mockClear();
    mockUseQueueList.mockReturnValue({ queue: [{ uuid: 'q1' }, { uuid: 'q2' }] });
    rerender(<TourQueueWatcher />);
    expect(notifyQueueLength).toHaveBeenCalledWith(2);
  });

  it('forwards currentClimb uuid changes and nulls', () => {
    const notifyQueueLength = vi.fn();
    const notifyCurrentClimb = vi.fn();
    mockUseOnboardingTourOptional.mockReturnValue({ notifyQueueLength, notifyCurrentClimb });
    mockUseCurrentClimb.mockReturnValue({ currentClimb: { uuid: 'first' } });

    const { rerender } = render(<TourQueueWatcher />);
    notifyCurrentClimb.mockClear();

    mockUseCurrentClimb.mockReturnValue({ currentClimb: { uuid: 'second' } });
    rerender(<TourQueueWatcher />);
    expect(notifyCurrentClimb).toHaveBeenCalledWith('second');

    notifyCurrentClimb.mockClear();
    mockUseCurrentClimb.mockReturnValue({ currentClimb: null });
    rerender(<TourQueueWatcher />);
    expect(notifyCurrentClimb).toHaveBeenCalledWith(null);
  });
});
