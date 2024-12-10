import { describe, it, expect, vi } from 'vitest';
import { createNextState } from '../core';
import { createMiddleware } from '../middleware-registry';

interface TestState {
  count: number;
  user: {
    name: string;
    role: 'admin' | 'user';
  };
}

describe('Middleware System', () => {
  const initialState: TestState = {
    count: 0,
    user: {
      name: 'Test User',
      role: 'user',
    },
  };

  describe('Middleware Execution', () => {
    it('should execute middleware in order', () => {
      const executionOrder: number[] = [];

      const middleware1 = createMiddleware(() => {
        executionOrder.push(1);
        return next => action => {
          executionOrder.push(2);
          const result = next(action);
          executionOrder.push(5);
          return result;
        };
      });

      const middleware2 = createMiddleware(() => {
        executionOrder.push(3);
        return next => action => {
          executionOrder.push(4);
          return next(action);
        };
      });

      const { setState } = createNextState({
        initialState,
        middleware: [middleware1, middleware2],
      });

      setState({ count: 1 });
      expect(executionOrder).toEqual([1, 2, 3, 4, 5]);
    });

    it('should allow middleware to cancel updates', () => {
      const validationMiddleware = createMiddleware(() => 
        next => action => {
          if (action.count < 0) return null;
          return next(action);
        }
      );

      const { setState, getState } = createNextState({
        initialState,
        middleware: [validationMiddleware],
      });

      setState({ count: -1 });
      expect(getState().count).toBe(0); // Update cancelled

      setState({ count: 1 });
      expect(getState().count).toBe(1); // Update allowed
    });
  });

  describe('Async Middleware', () => {
    it('should handle async operations', async () => {
      const asyncMiddleware = createMiddleware(() =>
        next => async action => {
          if (action.count !== undefined) {
            await new Promise(resolve => setTimeout(resolve, 10));
            return next({ count: action.count * 2 });
          }
          return next(action);
        }
      );

      const { setState, getState } = createNextState({
        initialState,
        middleware: [asyncMiddleware],
      });

      await setState({ count: 2 });
      expect(getState().count).toBe(4); // Doubled by middleware
    });

    it('should handle middleware errors', async () => {
      const errorMiddleware = createMiddleware(() =>
        next => action => {
          if (action.count === 999) {
            throw new Error('Middleware error');
          }
          return next(action);
        }
      );

      const { setState, getState } = createNextState({
        initialState,
        middleware: [errorMiddleware],
      });

      expect(() => setState({ count: 999 })).toThrow('Middleware error');
      expect(getState().count).toBe(0); // State unchanged after error
    });
  });

  describe('Logging Middleware', () => {
    it('should log state changes', () => {
      const logs: any[] = [];
      const loggingMiddleware = createMiddleware(() =>
        next => action => {
          logs.push({ type: 'before', state: action });
          const result = next(action);
          logs.push({ type: 'after', state: result });
          return result;
        }
      );

      const { setState } = createNextState({
        initialState,
        middleware: [loggingMiddleware],
      });

      setState({ count: 1 });
      expect(logs).toHaveLength(2);
      expect(logs[0].type).toBe('before');
      expect(logs[1].type).toBe('after');
    });
  });

  describe('Authorization Middleware', () => {
    it('should enforce role-based permissions', () => {
      const authMiddleware = createMiddleware(() =>
        next => action => {
          const state = getState();
          if (action.user?.role === 'admin' && state.user.role !== 'admin') {
            throw new Error('Unauthorized role change');
          }
          return next(action);
        }
      );

      const { setState, getState } = createNextState({
        initialState,
        middleware: [authMiddleware],
      });

      expect(() => 
        setState({ 
          user: { ...initialState.user, role: 'admin' } 
        })
      ).toThrow('Unauthorized role change');

      // Regular updates should work
      setState({ count: 1 });
      expect(getState().count).toBe(1);
    });
  });

  describe('Performance Middleware', () => {
    it('should track update performance', () => {
      const performanceLogs: any[] = [];
      const performanceMiddleware = createMiddleware(() =>
        next => action => {
          const start = performance.now();
          const result = next(action);
          const duration = performance.now() - start;
          performanceLogs.push({ action, duration });
          return result;
        }
      );

      const { setState } = createNextState({
        initialState,
        middleware: [performanceMiddleware],
      });

      setState({ count: 1 });
      expect(performanceLogs).toHaveLength(1);
      expect(performanceLogs[0].duration).toBeDefined();
      expect(performanceLogs[0].duration).toBeGreaterThan(0);
    });
  });

  describe('Middleware Composition', () => {
    it('should compose multiple middleware types', async () => {
      const logs: string[] = [];

      const loggingMiddleware = createMiddleware(() =>
        next => action => {
          logs.push('log');
          return next(action);
        }
      );

      const validationMiddleware = createMiddleware(() =>
        next => action => {
          logs.push('validate');
          if (action.count < 0) return null;
          return next(action);
        }
      );

      const asyncMiddleware = createMiddleware(() =>
        next => async action => {
          logs.push('async');
          await new Promise(resolve => setTimeout(resolve, 10));
          return next(action);
        }
      );

      const { setState } = createNextState({
        initialState,
        middleware: [loggingMiddleware, validationMiddleware, asyncMiddleware],
      });

      await setState({ count: 1 });
      expect(logs).toEqual(['log', 'validate', 'async']);
    });
  });
}); 