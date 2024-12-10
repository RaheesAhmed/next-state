// Utility types
export type Brand<K, T> = K & { __brand: T };
export type StateKey = Brand<string, 'StateKey'>;
export type Priority = 1 | 2 | 3 | 4 | 5;
export type DeepReadonly<T> = T extends object ? { readonly [P in keyof T]: DeepReadonly<T[P]> } : T;
export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

// Performance monitoring types
export interface PerformanceMetrics {
  updates: number;
  listeners: number;
  avgUpdateTime: number;
  lastUpdateTime: number;
}

// Error types
export interface NextStateError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Action types
export type ActionType<T, P = void> = {
  type: string;
  payload?: P;
  meta?: Record<string, unknown>;
};

export type Action<T, P = void> = P extends void
  ? () => (state: T) => DeepPartial<T>
  : (payload: P) => (state: T) => DeepPartial<T>;

// Selector types
export type Selector<T, R> = (state: DeepReadonly<T>) => R;
export type EqualityFn<T> = (prev: T, next: T) => boolean;

// Middleware types
export interface EnhancedMiddleware<T extends object> {
  id: string;
  priority: Priority;
  onStateChange: (prev: DeepReadonly<T>, next: T) => Promise<void> | void;
  onError: (error: NextStateError) => void;
}

// Storage types
export interface StorageConfig<T> {
  key: StateKey;
  version: number;
  migrations: {
    [version: number]: (state: unknown) => T;
  };
  serialize?: (state: T) => string;
  deserialize?: (data: string) => T;
}

// Snapshot types
export interface StateSnapshot<T> {
  state: T;
  timestamp: number;
}

// Core state configuration
export interface StateConfig<T extends object> {
  initialState: T;
  options?: Readonly<StateOptions<T>>;
}

export interface StateOptions<T extends object> {
  middleware?: EnhancedMiddleware<T>[];
  devTools?: boolean;
  suspense?: boolean;
  storage?: StorageConfig<T>;
}

// Debug types
export interface DebugLogger {
  log: (action: string, data: unknown) => void;
  error: (action: string, error: unknown) => void;
}

// Type guards
export function isValidState<T>(value: unknown): value is T {
  return value !== null && typeof value === 'object';
}

export function assertValidState<T>(value: unknown): asserts value is T {
  if (!isValidState<T>(value)) {
    throw new Error('Invalid state structure');
  }
}

// Cache types for server components
export interface ServerCache<T> {
  get: (key: string) => Promise<T | null>;
  set: (key: string, value: T) => Promise<void>;
  clear: () => Promise<void>;
}
