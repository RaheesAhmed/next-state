import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import Counter from './counter';

describe('Counter', () => {
  beforeEach(() => {
    // Reset Date mock before each test
    vi.useFakeTimers();
    render(<Counter />);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render initial count', () => {
    expect(screen.getByText(/Count: 0/)).toBeDefined();
  });

  it('should increment count', () => {
    fireEvent.click(screen.getByText('Increment'));
    expect(screen.getByText(/Count: 1/)).toBeDefined();
  });

  it('should decrement count', () => {
    fireEvent.click(screen.getByText('Decrement'));
    expect(screen.getByText(/Count: -1/)).toBeDefined();
  });

  it('should update lastUpdated timestamp', () => {
    const initialTimestamp = screen.getByText(/Last Updated:/).textContent;
    // Advance timer by 1 second
    vi.advanceTimersByTime(1000);
    fireEvent.click(screen.getByText('Increment'));
    const newTimestamp = screen.getByText(/Last Updated:/).textContent;
    expect(newTimestamp).not.toBe(initialTimestamp);
  });
});
