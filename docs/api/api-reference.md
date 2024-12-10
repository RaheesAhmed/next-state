# Next State API Reference

## Core API

### `create<T>`

Creates a new state store with type safety and configuration options.

```typescript
function create<T extends object>(config: StateConfig<T>): NextStateStore<T>

// Example
const store = create({
  initialState: {
    count: 0,
    user: null as User | null,
    todos: [] as Todo[]
  },
  options: {
    devTools: true,
    storage: {
      key: 'my-app',
      version: 1
    }
  }
});
```

#### Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `initialState` | `T` | The initial state object |
| `devTools` | `boolean` | Enable development tools |
| `storage` | `StorageConfig<T>` | Persistence configuration |
| `middleware` | `Middleware<T>[]` | Custom middleware |
| `suspense` | `boolean` | Enable React Suspense |

### React Hooks

#### `useNextState`

Subscribe to state changes with automatic updates.

```typescript
function useNextState<T, R>(
  selector?: (state: T) => R,
  equalityFn?: (prev: R, next: R) => boolean
): R

// Example
const count = useNextState(state => state.count);
const user = useNextState(state => state.user, Object.is);
```

#### `useOptimisticUpdate`

Perform optimistic updates with automatic rollback.

```typescript
function useOptimisticUpdate<T>(): [
  (update: DeepPartial<T>) => void,
  boolean
]

// Example
const [update, isPending] = useOptimisticUpdate();
update({ count: count + 1 });
```

#### `useNextAction`

Create type-safe actions with loading states.

```typescript
function useNextAction<T, P>(
  action: (payload: P) => Promise<DeepPartial<T>>
): {
  execute: (payload: P) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

// Example
const { execute, isLoading } = useNextAction(
  async (id: string) => {
    const user = await api.getUser(id);
    return { user };
  }
);
```

### Server Integration

#### `withServerState`

HOC for server component integration.

```typescript
function withServerState<T, P>(
  Component: React.ComponentType<P>,
  config: StateConfig<T>,
  options: ServerOptions
): React.ComponentType<P>

// Example
export default withServerState(TodoApp, config, {
  key: 'todos',
  cache: { ttl: 60000 }
});
```

#### `createServerAction`

Create server-side actions with optimistic updates.

```typescript
function createServerAction<T, P>(
  serverState: ServerState<T>,
  action: (payload: P) => Promise<DeepPartial<T>>
): (payload: P) => Promise<void>

// Example
const addTodo = createServerAction(serverState, 
  async (text: string) => ({
    todos: [{ id: Date.now(), text }]
  })
);
```

### Storage

#### Storage Configuration

```typescript
interface StorageConfig<T> {
  key: string;
  version: number;
  migrations?: {
    [version: number]: (state: unknown) => T;
  };
  serialize?: (data: T) => string;
  deserialize?: (data: string) => T;
}

// Example
const config = {
  storage: {
    key: 'app-state',
    version: 1,
    migrations: {
      0: (oldState) => ({
        ...oldState,
        newField: 'default'
      })
    }
  }
};
```

#### Storage Adapters

```typescript
interface StorageAdapter<T> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

// Example
const storage = createStorage(config, 'indexedDB');
```

### DevTools

#### Development Tools Configuration

```typescript
interface DevToolsConfig {
  name?: string;
  maxAge?: number;
  latency?: number;
  actionFilters?: string[];
  stateSanitizer?: (state: any) => any;
  actionSanitizer?: (action: any) => any;
}

// Example
const store = create({
  // ...
  options: {
    devTools: {
      name: 'MyApp',
      maxAge: 50,
      actionFilters: ['SET_USER']
    }
  }
});
```

### Error Handling

#### Error Types

```typescript
interface NextStateError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Example
throw new NextStateError({
  code: 'INVALID_STATE',
  message: 'Invalid state update',
  details: { update }
});
```

### Middleware

#### Middleware Configuration

```typescript
interface Middleware<T> {
  id: string;
  priority?: number;
  before?: (update: StateUpdate<T>) => StateUpdate<T> | null;
  after?: (state: T) => void;
  onError?: (error: Error) => void;
}

// Example
const loggingMiddleware: Middleware<T> = {
  id: 'logger',
  priority: 1,
  before: (update) => {
    console.log('Before update:', update);
    return update;
  },
  after: (state) => {
    console.log('After update:', state);
  }
};
```

## Best Practices

### State Structure

1. Keep state flat and normalized
2. Use TypeScript for type safety
3. Avoid redundant data
4. Use selectors for derived data
5. Split large states into domains

### Performance

1. Use selectors with memoization
2. Batch updates when possible
3. Implement proper equality checks
4. Avoid unnecessary re-renders
5. Use optimistic updates for better UX

### Error Handling

1. Use type-safe error handling
2. Implement proper error boundaries
3. Provide detailed error messages
4. Handle edge cases gracefully
5. Log errors appropriately

### Testing

1. Test state updates
2. Test selectors
3. Test middleware
4. Test error cases
5. Test performance

## Migration Guide

### Version 1.x to 2.x

```typescript
// Before (1.x)
const store = createStore({
  state: initialState
});

// After (2.x)
const store = create({
  initialState,
  options: {
    devTools: true
  }
});
```

## TypeScript Support

The library is written in TypeScript and provides full type safety:

```typescript
interface AppState {
  user: User | null;
  todos: Todo[];
  settings: Settings;
}

const store = create<AppState>({
  initialState: {
    user: null,
    todos: [],
    settings: defaultSettings
  }
});

// Type-safe selectors
const user = useNextState(state => state.user);
// Type-safe updates
store.setState({ user: newUser });
```
