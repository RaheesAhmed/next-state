import { type NextState, type StateConfig } from '../core';

export interface ServerStateConfig<T> extends StateConfig<T> {
  cache?: {
    ttl?: number;
    staleWhileRevalidate?: boolean;
  };
  revalidate?: {
    interval?: number;
    onFocus?: boolean;
    onReconnect?: boolean;
  };
}

export interface ServerState<T> extends NextState<T> {
  revalidate: () => Promise<void>;
  mutate: (data: Partial<T>) => Promise<void>;
  invalidate: () => Promise<void>;
}

export const createServerState = <T extends object>(
  config: ServerStateConfig<T>
): ServerState<T> => {
  // Implementation will be in separate files
  throw new Error('Not implemented');
};

// Export server-specific middleware
export { createServerMiddleware } from './middleware';
export { createServerStorage } from './storage';
export { createServerCache } from './cache';

// Export server utilities
export { withServerState } from './with-server-state';
export { createServerAction } from './actions';
export { createServerSelector } from './selectors'; 