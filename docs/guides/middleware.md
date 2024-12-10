# Middleware Guide

Learn how to use middleware to add powerful capabilities to your state management.

## Table of Contents

- [Introduction](#introduction)
- [Basic Usage](#basic-usage)
- [Common Patterns](#common-patterns)
- [Advanced Techniques](#advanced-techniques)
- [Best Practices](#best-practices)
- [Recipes](#recipes)

## Introduction

Middleware allows you to intercept and modify state changes, add side effects, and extend next-state's functionality.

### Middleware Lifecycle

```typescript
interface Middleware<T> {
  id?: string; // Unique identifier
  priority?: number; // Execution order (higher = earlier)
  onInit?: (state: T) => void; // Called when middleware is added
  onStateChange?: (
    // Called on every state change
    prev: T,
    next: T
  ) => void | Promise<void>;
  onError?: (
    // Called when errors occur
    error: Error
  ) => void | Promise<void>;
}
```

## Basic Usage

### Simple Logging Middleware

```typescript
const loggerMiddleware: Middleware<AppState> = {
  id: "logger",
  priority: 1,
  onStateChange: (prev, next) => {
    console.group("State Update");
    console.log("Previous:", prev);
    console.log("Next:", next);
    console.groupEnd();
  },
};

// Add to your state
const { middlewareRegistry } = createNextState({
  initialState,
  options: {
    middleware: [loggerMiddleware],
  },
});
```

### Analytics Tracking

```typescript
const analyticsMiddleware: Middleware<AppState> = {
  id: "analytics",
  onStateChange: (prev, next) => {
    // Track user changes
    if (prev.user !== next.user) {
      analytics.track("user_changed", {
        previous: prev.user?.id,
        current: next.user?.id,
      });
    }

    // Track feature usage
    if (prev.settings !== next.settings) {
      analytics.track("settings_updated", {
        changes: getChangedFields(prev.settings, next.settings),
      });
    }
  },
};
```

## Common Patterns

### Persistence Middleware

```typescript
const persistMiddleware = <T extends object>(key: string): Middleware<T> => ({
  id: "persist",
  priority: 100, // Run last
  onStateChange: async (_, next) => {
    try {
      await localStorage.setItem(key, JSON.stringify(next));
    } catch (error) {
      console.error("Failed to persist state:", error);
    }
  },
  onInit: async (state) => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error("Failed to load persisted state:", error);
    }
  },
});
```

### Performance Monitoring

```typescript
const performanceMiddleware: Middleware<AppState> = {
  id: "performance",
  onStateChange: (prev, next) => {
    const start = performance.now();

    // Return function to be called after state update
    return () => {
      const duration = performance.now() - start;
      if (duration > 16.67) {
        // Longer than one frame (60fps)
        console.warn("Slow state update:", duration.toFixed(2), "ms");
      }
    };
  },
};
```

## Advanced Techniques

### Debounced Updates

```typescript
const createDebouncedMiddleware = <T extends object>(
  delay: number
): Middleware<T> => {
  let timeout: NodeJS.Timeout;
  let pendingState: T | null = null;

  return {
    id: "debounce",
    onStateChange: (prev, next) => {
      clearTimeout(timeout);
      pendingState = next;

      return new Promise((resolve) => {
        timeout = setTimeout(() => {
          if (pendingState) {
            resolve(pendingState);
            pendingState = null;
          }
        }, delay);
      });
    },
  };
};

// Usage
middlewareRegistry.add(createDebouncedMiddleware(500));
```

### Undo/Redo History

```typescript
interface HistoryMiddleware<T> extends Middleware<T> {
  undo: () => void;
  redo: () => void;
}

const createHistoryMiddleware = <T extends object>(
  maxHistory: number = 10
): HistoryMiddleware<T> => {
  const past: T[] = [];
  const future: T[] = [];

  return {
    id: "history",
    onStateChange: (prev, next) => {
      past.push(prev);
      if (past.length > maxHistory) {
        past.shift();
      }
      future.length = 0;
    },
    undo: () => {
      if (past.length > 0) {
        const previous = past.pop()!;
        future.push(previous);
        return previous;
      }
    },
    redo: () => {
      if (future.length > 0) {
        const next = future.pop()!;
        past.push(next);
        return next;
      }
    },
  };
};
```

## Best Practices

### 1. Use TypeScript

Always define proper types for your middleware:

```typescript
interface AppState {
  user: User | null;
  settings: Settings;
}

const middleware: Middleware<AppState> = {
  // TypeScript will enforce correct state types
  onStateChange: (prev, next) => {
    // prev and next are properly typed
  },
};
```

### 2. Handle Errors

Always include error handling in middleware:

```typescript
const robustMiddleware: Middleware<AppState> = {
  onStateChange: async (prev, next) => {
    try {
      await someAsyncOperation(next);
    } catch (error) {
      // Log error
      console.error("Middleware error:", error);

      // Optionally prevent state update
      return prev;
    }
  },
  onError: (error) => {
    // Global error handling
    errorReporting.capture(error);
  },
};
```

### 3. Use Priority Levels

```typescript
const PRIORITY = {
  CRITICAL: 100,
  HIGH: 75,
  NORMAL: 50,
  LOW: 25,
  AUDIT: 0,
} as const;

const middlewareStack = [
  { ...persistMiddleware, priority: PRIORITY.CRITICAL },
  { ...validationMiddleware, priority: PRIORITY.HIGH },
  { ...analyticsMiddleware, priority: PRIORITY.LOW },
  { ...loggingMiddleware, priority: PRIORITY.AUDIT },
];
```

## Recipes

### Form Validation Middleware

```typescript
const validationMiddleware = <T extends { errors?: Record<string, string> }>(
  schema: ZodSchema<T>
): Middleware<T> => ({
  id: "validation",
  onStateChange: (prev, next) => {
    try {
      schema.parse(next);
      return { ...next, errors: {} };
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          ...next,
          errors: error.errors.reduce(
            (acc, err) => ({
              ...acc,
              [err.path.join(".")]: err.message,
            }),
            {}
          ),
        };
      }
    }
  },
});
```

### Real-time Sync Middleware

```typescript
const createWebSocketMiddleware = <T extends object>(
  url: string
): Middleware<T> => {
  let socket: WebSocket;

  return {
    id: "websocket",
    onInit: () => {
      socket = new WebSocket(url);
      socket.onmessage = (event) => {
        const update = JSON.parse(event.data);
        // Apply remote updates
      };
    },
    onStateChange: (prev, next) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(next));
      }
    },
  };
};
```

## Next Steps

- Explore [Advanced Patterns](../advanced/patterns.md)
- Learn about [Testing Middleware](../guides/testing.md)
- Check [Performance Optimization](../advanced/performance.md)
