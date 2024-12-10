import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createNextState } from '../core';
import { createStorage } from '../storage';

interface TestState {
  count: number;
  lastUpdated: number;
}

describe('State Persistence', () => {
  const initialState: TestState = {
    count: 0,
    lastUpdated: Date.now(),
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    indexedDB.deleteDatabase('nextState');
  });

  describe('Local Storage', () => {
    it('should persist state to localStorage', () => {
      const { setState, getState } = createNextState({
        initialState,
        storage: createStorage('localStorage'),
      });

      setState({ count: 1 });
      
      // Simulate page reload
      const newState = createNextState({
        initialState,
        storage: createStorage('localStorage'),
      });

      expect(newState.getState().count).toBe(1);
    });

    it('should handle storage quota exceeded', () => {
      const { setState } = createNextState({
        initialState,
        storage: createStorage('localStorage'),
      });

      // Mock localStorage.setItem to throw quota exceeded error
      const mockSetItem = vi.spyOn(Storage.prototype, 'setItem');
      mockSetItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => setState({ count: 1 })).not.toThrow();
      mockSetItem.mockRestore();
    });
  });

  describe('IndexedDB', () => {
    it('should persist large state objects', async () => {
      const largeState = {
        ...initialState,
        data: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item ${i}` })),
      };

      const { setState, getState } = createNextState({
        initialState: largeState,
        storage: createStorage('indexedDB'),
      });

      await setState({ count: 999 });
      
      // Verify persistence
      const persistedState = await getState();
      expect(persistedState.count).toBe(999);
      expect(persistedState.data.length).toBe(1000);
    });

    it('should handle indexedDB failures gracefully', async () => {
      // Mock indexedDB to be unavailable
      const originalIndexedDB = window.indexedDB;
      // @ts-expect-error - Intentionally breaking indexedDB
      window.indexedDB = null;

      const { setState, getState } = createNextState({
        initialState,
        storage: createStorage('indexedDB'),
      });

      await setState({ count: 1 });
      const state = await getState();
      expect(state.count).toBe(1); // Should fall back to memory storage

      window.indexedDB = originalIndexedDB;
    });
  });

  describe('Storage Synchronization', () => {
    it('should sync state across tabs', () => {
      const { setState } = createNextState({
        initialState,
        storage: createStorage('localStorage'),
      });

      setState({ count: 1 });

      // Simulate storage event from another tab
      const storageEvent = new StorageEvent('storage', {
        key: 'nextState',
        newValue: JSON.stringify({ count: 2, lastUpdated: Date.now() }),
      });
      window.dispatchEvent(storageEvent);

      const state = createNextState({
        initialState,
        storage: createStorage('localStorage'),
      }).getState();

      expect(state.count).toBe(2);
    });

    it('should handle concurrent updates', async () => {
      const instance1 = createNextState({
        initialState,
        storage: createStorage('localStorage'),
      });

      const instance2 = createNextState({
        initialState,
        storage: createStorage('localStorage'),
      });

      // Simulate concurrent updates
      await Promise.all([
        instance1.setState({ count: 1 }),
        instance2.setState({ count: 2 }),
      ]);

      // Both instances should eventually converge
      expect(instance1.getState().count).toBe(2);
      expect(instance2.getState().count).toBe(2);
    });
  });

  describe('Migration & Versioning', () => {
    it('should handle state schema migrations', () => {
      // Store old version state
      localStorage.setItem('nextState', JSON.stringify({
        version: 1,
        state: { oldCount: 1 },
      }));

      const { getState } = createNextState({
        initialState,
        storage: createStorage('localStorage'),
        migrations: {
          2: (oldState: any) => ({
            count: oldState.oldCount,
            lastUpdated: Date.now(),
          }),
        },
      });

      const state = getState();
      expect(state.count).toBe(1);
      expect(state.lastUpdated).toBeDefined();
    });

    it('should handle invalid stored state', () => {
      localStorage.setItem('nextState', 'invalid json{');

      const { getState } = createNextState({
        initialState,
        storage: createStorage('localStorage'),
      });

      // Should fall back to initial state
      expect(getState()).toEqual(initialState);
    });
  });
}); 