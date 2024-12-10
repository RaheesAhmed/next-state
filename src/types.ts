export interface NextStateMiddleware<T> {
  id?: string;
  priority?: number;
  onStateChange?: (prev: T, next: T) => void | Promise<void>;
  onError?: (error: Error) => void;
}

export interface NextStateConfig<T extends object> {
  initialState: T;
  options?: {
    middleware?: NextStateMiddleware<T>[];
    devTools?: boolean;
    suspense?: boolean;
  };
}

export interface NextStateStorage<T> {
  get: () => Promise<T | null>;
  set: (value: T) => Promise<void>;
  remove: () => Promise<void>;
}
