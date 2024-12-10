import { describe, it, expect, beforeEach } from 'vitest';
import { createNextState } from '../core';

interface TestState {
  count: number;
  user: {
    name: string;
    preferences: {
      theme: 'light' | 'dark';
    };
  };
}

describe('Core State Management', () => {
  const initialState: TestState = {
    count: 0,
    user: {
      name: 'Test User',
      preferences: {
        theme: 'light',
      },
    },
  };

  beforeEach(() => {
    // Reset any global state if needed
  });

  describe('State Creation', () => {
    it('should create state with initial values', () => {
      const { getState } = createNextState({ initialState });
      expect(getState()).toEqual(initialState);
    });

    it('should enforce type safety', () => {
      const { setState } = createNextState({ initialState });
      // @ts-expect-error - Invalid state type
      expect(() => setState({ invalid: true })).toThrow();
    });
  });

  describe('State Updates', () => {
    it('should handle shallow updates', () => {
      const { setState, getState } = createNextState({ initialState });
      setState({ count: 1 });
      expect(getState().count).toBe(1);
    });

    it('should handle nested updates', () => {
      const { setState, getState } = createNextState({ initialState });
      setState({
        user: {
          ...initialState.user,
          preferences: { theme: 'dark' },
        },
      });
      expect(getState().user.preferences.theme).toBe('dark');
    });

    it('should preserve immutability', () => {
      const { setState, getState } = createNextState({ initialState });
      const beforeState = getState();
      setState({ count: 1 });
      expect(beforeState).not.toBe(getState());
      expect(beforeState.count).toBe(0);
    });
  });

  describe('Selectors', () => {
    it('should select state slice', () => {
      const { select } = createNextState({ initialState });
      const countSelector = (state: TestState) => state.count;
      const count = select(countSelector);
      expect(count).toBe(0);
    });

    it('should memoize selectors', () => {
      const { select, setState } = createNextState({ initialState });
      const userSelector = (state: TestState) => state.user;
      const firstResult = select(userSelector);
      setState({ count: 1 }); // Update unrelated state
      const secondResult = select(userSelector);
      expect(firstResult).toBe(secondResult); // Reference equality
    });
  });

  describe('Error Handling', () => {
    it('should throw on invalid state updates', () => {
      const { setState } = createNextState({ initialState });
      // @ts-expect-error - Testing runtime type checking
      expect(() => setState(null)).toThrow();
      // @ts-expect-error - Testing runtime type checking
      expect(() => setState(undefined)).toThrow();
    });

    it('should validate nested object updates', () => {
      const { setState } = createNextState({ initialState });
      // @ts-expect-error - Testing invalid nested update
      expect(() => setState({ user: { invalid: true } })).toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle rapid updates', () => {
      const { setState, getState } = createNextState({ initialState });
      const updates = Array.from({ length: 1000 }, (_, i) => i);
      
      const start = performance.now();
      updates.forEach(count => setState({ count }));
      const end = performance.now();

      expect(end - start).toBeLessThan(1000); // Should complete in less than 1s
      expect(getState().count).toBe(999);
    });

    it('should batch updates efficiently', () => {
      const { setState, getState } = createNextState({ initialState });
      let renderCount = 0;
      
      // Simulate React rendering
      const unsubscribe = createNextState.subscribe(() => {
        renderCount++;
      });

      setState(prev => ({ count: prev.count + 1 }));
      setState(prev => ({ count: prev.count + 1 }));
      setState(prev => ({ count: prev.count + 1 }));

      expect(renderCount).toBeLessThan(4); // Should batch updates
      expect(getState().count).toBe(3);
      
      unsubscribe();
    });
  });
}); 