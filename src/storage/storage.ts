import { Storage } from '../types/types';

export function createStorage(): Storage {
  const storage = typeof window !== 'undefined' ? window.localStorage : new Map<string, string>();

  return {
    getItem: async (key: string) => {
      if (storage instanceof Map) {
        return storage.get(key) ?? null;
      }
      return storage.getItem(key);
    },
    setItem: async (key: string, value: string) => {
      if (storage instanceof Map) {
        storage.set(key, value);
      } else {
        storage.setItem(key, value);
      }
    },
    removeItem: async (key: string) => {
      if (storage instanceof Map) {
        storage.delete(key);
      } else {
        storage.removeItem(key);
      }
    },
  };
}
