import { ReactNode } from 'react';

// Core state types
export interface StateConfig<T extends object> {
  initialState: T;
  options?: StateOptions;
}

export interface StateOptions {
  name?: string;
  debug?: boolean;
  persistence?: boolean;
  middleware?: Middleware[];
}

// Action types
export type Action<T> = (state: T) => Partial<T>;
export type AsyncAction<T> = (state: T) => Promise<Partial<T>>;
export type StateUpdate<T> = Partial<T>;

// Selector types
export type Selector<T, S> = (state: T) => S;

// Middleware types
export type Middleware<T = any> = (
  state: T,
  nextState: Partial<T>
) => Partial<T> | Promise<Partial<T>>;

// Provider props
export interface ProviderProps {
  children: ReactNode;
  initialState?: any;
}

// Error types
export interface INextStateError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// State snapshot for devtools
export interface StateSnapshot<T> {
  state: T;
  timestamp: number;
  action?: string;
}

// Storage interface
export interface Storage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

// Dev tools types
export type DeepReadonly<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};

export interface PerformanceMetrics {
  updateTime: number;
  renderTime: number;
  memoryUsage: number;
}
