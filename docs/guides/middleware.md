# Middleware Guide

Middleware provides a powerful way to intercept state updates, perform side effects, and modify state changes. This guide covers middleware implementation, patterns, and best practices.

## Core Concepts

### Middleware Interface

```typescript
interface Middleware<T> {
  id: string;
  priority?: number;
  before?: (update: StateUpdate<T>) => StateUpdate<T> | null;
  after?: (state: T) => void;
  onError?: (error: Error) => void;
}

interface StateUpdate<T> {
  type: 'set' | 'merge' | 'reset';
  payload: DeepPartial<T>;
  meta?: Record<string, unknown>;
}
```

### Middleware Lifecycle

1. `before`: Called before state update
2. State update occurs
3. `after`: Called after state update
4. `onError`: Called if any error occurs

## Common Middleware Examples

### Logging Middleware

```typescript
const loggingMiddleware: Middleware<T> = {
  id: 'logger',
  priority: 1,
  before: (update) => {
    console.group('State Update');
    console.log('Type:', update.type);
    console.log('Payload:', update.payload);
    console.log('Meta:', update.meta);
    return update;
  },
  after: (state) => {
    console.log('New State:', state);
    console.groupEnd();
  },
  onError: (error) => {
    console.error('State Update Error:', error);
  }
};
```

### Analytics Middleware

```typescript
const analyticsMiddleware: Middleware<T> = {
  id: 'analytics',
  before: (update) => {
    if (update.meta?.track) {
      analytics.track(update.meta.track as string, {
        payload: update.payload
      });
    }
    return update;
  },
  after: (state) => {
    // Track specific state changes
    analytics.identify(state.user?.id, {
      plan: state.user?.plan
    });
  }
};
```

### Persistence Middleware

```typescript
const persistenceMiddleware: Middleware<T> = {
  id: 'persistence',
  priority: 2,
  after: async (state) => {
    try {
      await localStorage.setItem('app-state', JSON.stringify(state));
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  }
};
```

### Validation Middleware

```typescript
const validationMiddleware: Middleware<T> = {
  id: 'validator',
  priority: 0, // Run first
  before: (update) => {
    const schema = getSchemaForUpdate(update.type);
    if (schema) {
      try {
        schema.parse(update.payload);
      } catch (error) {
        throw new Error(`Validation failed: ${error.message}`);
      }
    }
    return update;
  }
};
```

### Undo/Redo Middleware

```typescript
const undoMiddleware: Middleware<T> = {
  id: 'undo',
  private history: Array<{ state: T; timestamp: number }> = [],
  private maxHistory = 50,
  private currentIndex = -1,

  before: (update) => {
    if (update.meta?.skipHistory) {
      return update;
    }
    
    // Save current state
    this.history = [
      ...this.history.slice(0, this.currentIndex + 1),
      { state: store.getState(), timestamp: Date.now() }
    ];
    
    // Maintain history limit
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    
    this.currentIndex = this.history.length - 1;
    return update;
  },

  undo: () => {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      const { state } = this.history[this.currentIndex];
      store.setState(state, { skipHistory: true });
    }
  },

  redo: () => {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      const { state } = this.history[this.currentIndex];
      store.setState(state, { skipHistory: true });
    }
  }
};
```

### Performance Monitoring Middleware

```typescript
const performanceMiddleware: Middleware<T> = {
  id: 'performance',
  private updates = 0,
  private totalTime = 0,
  private startTime: number | null = null,

  before: (update) => {
    this.startTime = performance.now();
    return update;
  },

  after: () => {
    if (this.startTime) {
      const duration = performance.now() - this.startTime;
      this.updates++;
      this.totalTime += duration;

      if (duration > 16) { // 60fps threshold
        console.warn('Slow state update:', {
          duration,
          averageTime: this.totalTime / this.updates
        });
      }
    }
  }
};
```

## Advanced Patterns

### Middleware Composition

```typescript
function composeMiddleware<T>(...middleware: Middleware<T>[]): Middleware<T> {
  return {
    id: 'composed',
    before: (update) => {
      return middleware.reduce(
        (result, m) => result && m.before?.(result),
        update
      );
    },
    after: (state) => {
      middleware.forEach(m => m.after?.(state));
    },
    onError: (error) => {
      middleware.forEach(m => m.onError?.(error));
    }
  };
}
```

### Conditional Middleware

```typescript
function createConditionalMiddleware<T>(
  condition: (update: StateUpdate<T>) => boolean,
  middleware: Middleware<T>
): Middleware<T> {
  return {
    id: `conditional-${middleware.id}`,
    before: (update) => {
      if (condition(update)) {
        return middleware.before?.(update);
      }
      return update;
    },
    after: (state) => {
      if (condition({ type: 'set', payload: state })) {
        middleware.after?.(state);
      }
    }
  };
}
```

### Async Middleware

```typescript
const asyncMiddleware: Middleware<T> = {
  id: 'async',
  private queue: Promise<void> = Promise.resolve(),

  before: async (update) => {
    // Queue async operations
    this.queue = this.queue.then(async () => {
      try {
        await someAsyncOperation(update);
      } catch (error) {
        this.onError?.(error);
      }
    });
    return update;
  }
};
```

## Best Practices

1. **Prioritize Middleware**
   ```typescript
   const middleware = [
     { id: 'validator', priority: 0 },   // Run first
     { id: 'logger', priority: 1 },      // Run second
     { id: 'persistence', priority: 2 },  // Run last
   ];
   ```

2. **Handle Errors Gracefully**
   ```typescript
   onError: (error) => {
     // Log error
     console.error('Middleware error:', error);
     
     // Notify monitoring
     errorMonitoring.capture(error);
     
     // Recover if possible
     try {
       // Recovery logic
     } catch (recoveryError) {
       // Last resort error handling
     }
   }
   ```

3. **Use Meta for Control Flow**
   ```typescript
   store.setState(
     { user },
     { 
       meta: {
         source: 'login',
         skipPersistence: true,
         track: 'user_updated'
       }
     }
   );
   ```

4. **Optimize Performance**
   ```typescript
   before: (update) => {
     // Skip expensive operations for frequent updates
     if (update.meta?.frequent) {
       return update;
     }
     
     // Perform expensive operation
     return expensiveOperation(update);
   }
   ```

5. **Type Safety**
   ```typescript
   interface CustomMeta {
     track?: string;
     skipPersistence?: boolean;
     source?: 'login' | 'signup' | 'update';
   }

   interface TypedMiddleware<T> extends Middleware<T> {
     before: (update: StateUpdate<T> & { meta?: CustomMeta }) => 
       StateUpdate<T> | null;
   }
   ```

## Testing Middleware

```typescript
describe('Middleware', () => {
  let store: Store<TestState>;
  let middleware: Middleware<TestState>;

  beforeEach(() => {
    middleware = {
      id: 'test',
      before: jest.fn(update => update),
      after: jest.fn(),
      onError: jest.fn()
    };

    store = createStore({
      initialState: testState,
      middleware: [middleware]
    });
  });

  it('should intercept updates', () => {
    store.setState({ count: 1 });
    
    expect(middleware.before).toHaveBeenCalledWith({
      type: 'set',
      payload: { count: 1 }
    });
    
    expect(middleware.after).toHaveBeenCalledWith({
      ...testState,
      count: 1
    });
  });

  it('should handle errors', () => {
    const error = new Error('Test error');
    middleware.before = jest.fn(() => {
      throw error;
    });

    store.setState({ count: 1 });
    
    expect(middleware.onError).toHaveBeenCalledWith(error);
  });
});
```
