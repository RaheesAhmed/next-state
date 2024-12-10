import { describe, it, expect, beforeEach } from 'vitest';
import { createNextState } from '../core';

interface TestState {
  count: number;
  items: Array<{ id: number; value: string }>;
  nested: {
    deep: {
      value: number;
      array: number[];
    };
  };
}

describe('Performance Tests', () => {
  let initialState: TestState;

  beforeEach(() => {
    initialState = {
      count: 0,
      items: Array.from({ length: 100 }, (_, i) => ({
        id: i,
        value: `item ${i}`,
      })),
      nested: {
        deep: {
          value: 0,
          array: Array.from({ length: 100 }, (_, i) => i),
        },
      },
    };
  });

  describe('State Update Performance', () => {
    it('should handle rapid updates efficiently', () => {
      const { setState, getState } = createNextState({ initialState });
      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        setState({ count: i });
      }

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(1000); // Should complete 1000 updates in less than 1s
      expect(getState().count).toBe(iterations - 1);
    });

    it('should handle large state updates efficiently', () => {
      const largeState = {
        ...initialState,
        items: Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          value: `item ${i}`,
          metadata: {
            created: Date.now(),
            modified: Date.now(),
            tags: ['tag1', 'tag2', 'tag3'],
          },
        })),
      };

      const { setState, getState } = createNextState({ initialState: largeState });
      const start = performance.now();

      setState({
        items: largeState.items.map(item => ({
          ...item,
          value: `updated ${item.value}`,
        })),
      });

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(100); // Should update 10000 items in less than 100ms
      expect(getState().items[0].value).toStartWith('updated');
    });
  });

  describe('Memory Usage', () => {
    it('should maintain constant memory usage during updates', () => {
      const { setState } = createNextState({ initialState });
      const iterations = 10000;
      const memorySnapshots: number[] = [];

      // Measure memory usage during updates
      for (let i = 0; i < iterations; i++) {
        if (i % 1000 === 0) {
          // @ts-expect-error - memory is available in test environment
          memorySnapshots.push(process.memoryUsage().heapUsed);
        }
        setState({ count: i });
      }

      // Calculate memory growth
      const memoryGrowth = memorySnapshots[memorySnapshots.length - 1] - memorySnapshots[0];
      const averageGrowthPerUpdate = memoryGrowth / iterations;

      expect(averageGrowthPerUpdate).toBeLessThan(1024); // Less than 1KB growth per update
    });

    it('should cleanup unused references', () => {
      const { setState, getState } = createNextState({ initialState });
      const weakRefs: WeakRef<any>[] = [];

      // Create many state updates with objects that should be garbage collected
      for (let i = 0; i < 1000; i++) {
        const obj = { value: i };
        weakRefs.push(new WeakRef(obj));
        setState({ count: i, metadata: obj });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Check if references were cleaned up
      const remainingRefs = weakRefs.filter(ref => ref.deref()).length;
      expect(remainingRefs).toBeLessThan(weakRefs.length);
    });
  });

  describe('Selector Performance', () => {
    it('should memoize selectors efficiently', () => {
      const { setState, select } = createNextState({ initialState });
      const selectDeepValue = (state: TestState) => state.nested.deep.value;
      const results: number[] = [];
      const start = performance.now();

      // Perform many selections with unrelated state updates
      for (let i = 0; i < 1000; i++) {
        setState({ count: i }); // Update unrelated state
        results.push(select(selectDeepValue)); // Should use memoized value
      }

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(500); // Should complete in less than 500ms
      expect(new Set(results).size).toBe(1); // All results should be the same
    });

    it('should handle complex computed values efficiently', () => {
      const { setState, select } = createNextState({ initialState });
      const computeExpensive = (state: TestState) => {
        return state.items.reduce((acc, item) => {
          return acc + item.id * Math.sqrt(state.nested.deep.array.length);
        }, 0);
      };

      const start = performance.now();
      const initial = select(computeExpensive);

      // Update unrelated state
      setState({ count: 999 });
      const afterUpdate = select(computeExpensive);

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(50); // Complex computation should be fast
      expect(initial).toBe(afterUpdate); // Should reuse memoized value
    });
  });

  describe('Concurrent Updates', () => {
    it('should handle concurrent updates efficiently', async () => {
      const { setState, getState } = createNextState({ initialState });
      const updates = Array.from({ length: 100 }, (_, i) => i);
      const start = performance.now();

      await Promise.all(
        updates.map(i =>
          setState(async state => ({
            count: state.count + 1,
            items: [...state.items, { id: state.items.length + i, value: `new ${i}` }],
          }))
        )
      );

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(1000); // Concurrent updates should be fast
      expect(getState().count).toBe(initialState.count + updates.length);
      expect(getState().items.length).toBe(initialState.items.length + updates.length);
    });
  });

  describe('Browser Compatibility', () => {
    it('should work with different storage mechanisms', async () => {
      const { setState, getState } = createNextState({
        initialState,
        storage: {
          type: 'localStorage',
          key: 'test-state',
        },
      });

      const updates = Array.from({ length: 100 }, (_, i) => i);
      const start = performance.now();

      for (const i of updates) {
        await setState({ count: i });
      }

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(1000); // Storage operations should be fast
      expect(getState().count).toBe(updates[updates.length - 1]);

      // Verify storage
      const stored = JSON.parse(localStorage.getItem('test-state') || '{}');
      expect(stored.count).toBe(getState().count);
    });

    it('should handle storage quota limits', () => {
      const { setState } = createNextState({
        initialState,
        storage: {
          type: 'localStorage',
          key: 'test-state',
        },
      });

      // Create large state that might exceed quota
      const largeState = {
        ...initialState,
        items: Array.from({ length: 100000 }, (_, i) => ({
          id: i,
          value: 'x'.repeat(1000), // 1KB per item
        })),
      };

      // Should handle quota exceeded gracefully
      expect(() => setState(largeState)).not.toThrow();
    });
  });
}); 