import type { NextStateStorage } from '../types/types';

export function createStorage<T>(key: string = 'next-state'): NextStateStorage<T> {
  return {
    async get(): Promise<T | null> {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch (error) {
        console.error('Storage get error:', error);
        return null;
      }
    },

    async set(value: T): Promise<void> {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error('Storage set error:', error);
      }
    },

    async remove(): Promise<void> {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error('Storage remove error:', error);
      }
    },
  };
}
