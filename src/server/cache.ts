export function createServerCache<T>() {
  const cache = new Map<string, T>();

  return {
    get: (key: string) => cache.get(key),
    set: (key: string, value: T) => cache.set(key, value),
    delete: (key: string) => cache.delete(key),
    clear: () => cache.clear(),
  };
}
