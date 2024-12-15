import { Storage } from '../types/types';

export function createServerStorage(): Storage {
  const storage = new Map<string, string>();

  return {
    getItem: async (key: string) => storage.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: async (key: string) => {
      storage.delete(key);
    },
  };
}
