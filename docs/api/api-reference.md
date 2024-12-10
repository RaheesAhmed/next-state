# API Reference

## Table of Contents

- [createNextState](#createnextstate)
- [useNextState](#usenextstate)
- [createNextAction](#createnextaction)
- [Provider](#provider)
- [withNextServer](#withnextserver)
- [MiddlewareRegistry](#middlewareregistry)

## createNextState

Creates a new state instance with configuration options.

### Type Definition

```typescript
function createNextState<T extends object>(config: {
  initialState: T;
  options?: {
    persist?: PersistOptions<T>;
    middleware?: Middleware<T>[];
    devTools?: boolean | DevToolsOptions;
    suspense?: boolean;
  };
}): {
  Provider: React.FC<ProviderProps>;
  useNextState: UseNextState<T>;
  createNextAction: CreateNextAction<T>;
  withNextServer: WithNextServer<T>;
  middlewareRegistry: MiddlewareRegistry<T>;
};

interface PersistOptions<T> {
  storage: "localStorage" | "sessionStorage" | "indexedDB";
  key?: string;
  version?: number;
  migrations?: Array<{
    version: number;
    migrate: (state: any) => T;
  }>;
  serialize?: (state: T) => string;
  deserialize?: (serialized: string) => T;
}

interface DevToolsOptions {
  name?: string;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  features?: Array<"history" | "export" | "import" | "filter">;
}
```

### Basic Usage

```typescript
const { Provider, useNextState } = createNextState({
  initialState: {
    count: 0,
  },
});
```

### With All Options

```typescript
const state = createNextState({
  initialState: {
    user: null,
    settings: { theme: "light" },
  },
  options: {
    // Persistence configuration
    persist: {
      storage: "localStorage",
      key: "app-state",
      version: 1,
      migrations: [
        {
          version: 1,
          migrate: (oldState) => ({
            ...oldState,
            settings: { ...oldState.settings, newField: "default" },
          }),
        },
      ],
      serialize: (state) => JSON.stringify(state),
      deserialize: (str) => JSON.parse(str),
    },

    // Development tools
    devTools: {
      name: "My App State",
      position: "bottom-right",
      features: ["history", "export"],
    },

    // Enable Suspense integration
    suspense: true,
  },
});
```

## useNextState

Hook to access and select state values.

### Type Definition

```typescript
function useNextState<S>(
  selector: (state: T) => S,
  options?: {
    compare?: (a: S, b: S) => boolean;
    deps?: any[];
  }
): S;
```

### Usage Examples

```typescript
// Basic selection
const count = useNextState((state) => state.count);

// With custom comparison
const user = useNextState((state) => state.user, {
  compare: (a, b) => a?.id === b?.id,
});

// Complex selection
const todoStats = useNextState((state) => ({
  total: state.todos.length,
  completed: state.todos.filter((t) => t.completed).length,
}));

// With dependencies
const filteredItems = useNextState(
  (state) => filterItems(state.items, props.filter),
  { deps: [props.filter] }
);
```

## createNextAction

Creates a type-safe action creator.

### Type Definition

```typescript
function createNextAction<Args extends any[], R = void>(
  action: (...args: Args) => (state: T) => Partial<T> | Promise<Partial<T>>
): (...args: Args) => Promise<R>;
```

### Usage Examples

```typescript
// Synchronous action
const increment = createNextAction((amount: number = 1) => (state) => ({
  count: state.count + amount,
}));

// Async action with error handling
const fetchUser = createNextAction((userId: string) => async (state) => {
  try {
    const user = await api.getUser(userId);
    return { user, error: null };
  } catch (error) {
    return { error: error.message };
  }
});

// Action with multiple updates
const updateSettings = createNextAction(
  (settings: Partial<Settings>) => (state) => ({
    settings: { ...state.settings, ...settings },
    lastUpdated: Date.now(),
  })
);
```

## MiddlewareRegistry

Manages middleware for state changes.

### Type Definition

```typescript
interface MiddlewareRegistry<T> {
  add: (middleware: Middleware<T>) => string;
  remove: (id: string) => void;
  clear: () => void;
}

interface Middleware<T> {
  id?: string;
  priority?: number;
  onStateChange?: (prev: T, next: T) => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;
  onInit?: (state: T) => void | Promise<void>;
}
```

### Usage Examples

```typescript
// Adding middleware
middlewareRegistry.add({
  id: "logger",
  priority: 1,
  onStateChange: (prev, next) => {
    console.log("State changed:", { prev, next });
  },
});

// Conditional middleware
middlewareRegistry.add({
  id: "analytics",
  onStateChange: (prev, next) => {
    if (prev.user !== next.user) {
      analytics.track("user_changed", next.user);
    }
  },
});

// Async middleware
middlewareRegistry.add({
  id: "sync",
  onStateChange: async (prev, next) => {
    await api.syncState(next);
  },
});
```

## withNextServer

Creates server-side actions with caching.

### Type Definition

```typescript
function withNextServer<Args extends any[], R>(
  key: string,
  handler: (...args: Args) => Promise<R>,
  options?: {
    cache?: boolean;
    revalidate?: number;
  }
): (...args: Args) => Promise<R>;
```

### Usage Examples

```typescript
// Basic server action
const fetchData = withNextServer("fetch-data", async () => {
  return await db.query();
});

// With cache options
const getUser = withNextServer(
  "get-user",
  async (userId: string) => {
    return await db.users.findUnique({ where: { id: userId } });
  },
  {
    cache: true,
    revalidate: 60, // Seconds
  }
);

// With error handling
const submitForm = withNextServer("submit-form", async (data: FormData) => {
  try {
    const result = await api.submit(data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

## Type Utilities

Helper types for common use cases.

```typescript
// Deep partial type
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Action result type
type ActionResult<T> = Partial<T> | Promise<Partial<T>>;

// Selector type
type Selector<T, R> = (state: T) => R;
```

## Error Handling

All async operations return structured error types:

```typescript
interface StateError {
  code: "PERSISTENCE_ERROR" | "ACTION_ERROR" | "MIDDLEWARE_ERROR";
  message: string;
  originalError?: unknown;
}

// Error handling example
try {
  await action();
} catch (error) {
  if (error.code === "ACTION_ERROR") {
    // Handle action error
  }
}
```

## Next Steps

- Explore [Core Concepts](../getting-started/core-concepts.md)
- Learn about [Advanced Patterns](../advanced/patterns.md)
- Check out [Examples](../examples/README.md)
