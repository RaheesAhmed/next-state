// Deep merge utility
export function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    const value = source[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = deepMerge(result[key] as object, value as object) as any;
    } else {
      result[key] = value as any;
    }
  }
  
  return result;
}

// Performance monitoring
export const createPerformanceMonitor = () => {
  let updateCount = 0;
  let totalUpdateTime = 0;
  let lastUpdateTime = 0;

  return {
    trackUpdate: (duration: number) => {
      updateCount++;
      totalUpdateTime += duration;
      lastUpdateTime = duration;
    },
    getMetrics: () => ({
      updates: updateCount,
      avgUpdateTime: totalUpdateTime / updateCount,
      lastUpdateTime
    })
  };
};

// Debug logger
export const createDebugLogger = (enabled: boolean = false) => ({
  log: (message: string, data?: any) => {
    if (enabled) {
      console.log(`[NextState] ${message}`, data);
    }
  },
  error: (message: string, error?: any) => {
    if (enabled) {
      console.error(`[NextState] ${message}`, error);
    }
  }
});

// Listener Set with type safety
export class ListenerSet<T extends Function> {
  private listeners = new Set<T>();

  add(listener: T) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  remove(listener: T) {
    this.listeners.delete(listener);
  }

  notify(...args: any[]) {
    this.listeners.forEach(listener => listener(...args));
  }

  clear() {
    this.listeners.clear();
  }

  get size() {
    return this.listeners.size;
  }
} 