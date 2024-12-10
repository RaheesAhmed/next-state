// Type utilities
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type ActionCreator<T, A extends any[]> = (...args: A) => (state: T) => Partial<T>;

// State utilities
export function isStateEqual<T>(prev: T, next: T): boolean {
  if (prev === next) return true;
  if (typeof prev !== typeof next) return false;
  if (typeof prev !== 'object') return prev === next;
  if (prev === null || next === null) return prev === next;
  
  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next as object);
  
  if (prevKeys.length !== nextKeys.length) return false;
  
  return prevKeys.every(key => 
    isStateEqual((prev as any)[key], (next as any)[key])
  );
}

// Selector utilities
export function createSelector<T, R>(
  selector: (state: T) => R,
  equals: (prev: R, next: R) => boolean = isStateEqual
) {
  let prevResult: R;
  let prevState: T;
  
  return (state: T): R => {
    if (state === prevState) {
      return prevResult;
    }
    
    const nextResult = selector(state);
    if (equals(prevResult, nextResult)) {
      return prevResult;
    }
    
    prevState = state;
    prevResult = nextResult;
    return nextResult;
  };
}

// Storage utilities
export function createStorage(key: string) {
  return {
    get: async <T>(): Promise<T | null> => {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch {
        return null;
      }
    },
    set: async <T>(value: T): Promise<void> => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Handle storage errors
      }
    },
    remove: async (): Promise<void> => {
      try {
        localStorage.removeItem(key);
      } catch {
        // Handle storage errors
      }
    },
  };
}

// Performance utilities
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let lastRun = 0;
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastRun >= ms) {
      fn(...args);
      lastRun = now;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fn(...args);
        lastRun = Date.now();
      }, ms - (now - lastRun));
    }
  };
}

// Error utilities
export class NextStateError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'NextStateError';
  }
}

export function isNextStateError(error: unknown): error is NextStateError {
  return error instanceof NextStateError;
}

// Validation utilities
export function validateState<T>(state: T, schema: any): boolean {
  // Implementation will depend on chosen validation library
  return true;
}

// Export all utilities
export * from './types';
export * from './performance';
export * from './storage';
export * from './validation'; 