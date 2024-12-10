# Next State Technical Documentation

## Architecture Overview

Next State is a type-safe state management solution designed specifically for Next.js applications. It provides a minimal yet powerful API surface with built-in support for server components, persistence, and development tools.

### Core Components

```
┌─────────────────────────────────────────┐
│              Next State                 │
├─────────────────┬───────────────────────┤
│   Core Store    │    Server Store       │
├─────────────────┼───────────────────────┤
│   Middleware    │    Storage System     │
├─────────────────┼───────────────────────┤
│   DevTools      │    React Bindings     │
└─────────────────┴───────────────────────┘
```

## Implementation Details

### Store Implementation

```typescript
export class Store<T extends object> {
  private state: T;
  private subscribers: Set<Subscriber<T>>;
  private middleware: MiddlewareStack<T>;
  private options: StoreOptions<T>;

  constructor(config: StoreConfig<T>) {
    this.state = config.initialState;
    this.subscribers = new Set();
    this.middleware = new MiddlewareStack(config.options?.middleware);
    this.options = config.options || {};
  }

  getState(): T {
    return this.state;
  }

  setState(
    update: DeepPartial<T> | ((state: T) => DeepPartial<T>),
    meta?: Record<string, unknown>
  ): void {
    const nextState = this.computeNextState(update);
    const stateUpdate = {
      type: 'set',
      payload: nextState,
      meta
    };

    this.middleware.before(stateUpdate);
    this.state = this.merge(this.state, nextState);
    this.notify();
    this.middleware.after(this.state);
  }

  subscribe(subscriber: Subscriber<T>): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }

  private notify(): void {
    this.subscribers.forEach(subscriber => subscriber(this.state));
  }

  private computeNextState(
    update: DeepPartial<T> | ((state: T) => DeepPartial<T>)
  ): DeepPartial<T> {
    return typeof update === 'function' ? update(this.state) : update;
  }

  private merge(target: T, source: DeepPartial<T>): T {
    // Deep merge implementation
  }
}
```

### Middleware System

```typescript
export class MiddlewareStack<T> {
  private middleware: Middleware<T>[];

  constructor(middleware: Middleware<T>[] = []) {
    this.middleware = this.sortMiddleware(middleware);
  }

  before(update: StateUpdate<T>): StateUpdate<T> {
    return this.middleware.reduce(
      (result, m) => result && m.before?.(result),
      update
    );
  }

  after(state: T): void {
    this.middleware.forEach(m => m.after?.(state));
  }

  private sortMiddleware(middleware: Middleware<T>[]): Middleware<T>[] {
    return [...middleware].sort((a, b) => 
      (b.priority || 0) - (a.priority || 0)
    );
  }
}
```

### Storage System

```typescript
export class StorageSystem<T> {
  private adapter: StorageAdapter;
  private options: StorageOptions;

  constructor(options: StorageOptions) {
    this.adapter = this.createAdapter(options.type);
    this.options = options;
  }

  async save(state: T): Promise<void> {
    const serialized = this.serialize(state);
    await this.adapter.set(this.options.key, serialized);
  }

  async load(): Promise<T | null> {
    const serialized = await this.adapter.get(this.options.key);
    return serialized ? this.deserialize(serialized) : null;
  }

  private serialize(state: T): string {
    return this.options.serialize?.(state) || 
      JSON.stringify(state);
  }

  private deserialize(data: string): T {
    return this.options.deserialize?.(data) || 
      JSON.parse(data);
  }

  private createAdapter(type: StorageType): StorageAdapter {
    switch (type) {
      case 'localStorage':
        return new LocalStorageAdapter();
      case 'indexedDB':
        return new IndexedDBAdapter();
      default:
        throw new Error(`Unsupported storage type: ${type}`);
    }
  }
}
```

### React Integration

```typescript
export function useNextState<T, R>(
  selector: (state: T) => R,
  equalityFn: (prev: R, next: R) => boolean = Object.is
): R {
  const store = useContext(StoreContext);
  const [state, setState] = useState(() => 
    selector(store.getState())
  );

  useEffect(() => {
    const checkForUpdates = (newState: T) => {
      const newSelectedState = selector(newState);
      if (!equalityFn(state, newSelectedState)) {
        setState(newSelectedState);
      }
    };

    // Initial subscription
    const unsubscribe = store.subscribe(checkForUpdates);
    
    // Cleanup subscription
    return unsubscribe;
  }, [store, selector, equalityFn, state]);

  return state;
}
```

### Server Integration

```typescript
export class ServerStore<T> extends Store<T> {
  private cache: Map<string, CacheEntry<T>>;
  private options: ServerStoreOptions;

  constructor(config: ServerStoreConfig<T>) {
    super(config);
    this.cache = new Map();
    this.options = config.options || {};
  }

  async getServerState(key: string): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && !this.isStale(cached)) {
      return cached.value;
    }

    const value = await this.fetchState(key);
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });

    return value;
  }

  private isStale(entry: CacheEntry<T>): boolean {
    if (!this.options.ttl) return false;
    return Date.now() - entry.timestamp > this.options.ttl;
  }
}
```

## Type System

### Core Types

```typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? DeepPartial<T[P]>
    : T[P];
};

type Subscriber<T> = (state: T) => void;

interface StoreConfig<T> {
  initialState: T;
  options?: StoreOptions<T>;
}

interface StoreOptions<T> {
  middleware?: Middleware<T>[];
  storage?: StorageOptions;
  devTools?: boolean | DevToolsOptions;
  suspense?: boolean;
}

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

### Storage Types

```typescript
interface StorageOptions {
  type: 'localStorage' | 'indexedDB';
  key: string;
  version?: number;
  serialize?: (data: any) => string;
  deserialize?: (data: string) => any;
  migrations?: Record<number, Migration>;
}

interface Migration {
  up: (state: unknown) => unknown;
  down: (state: unknown) => unknown;
}

interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

### Server Types

```typescript
interface ServerStoreConfig<T> extends StoreConfig<T> {
  options?: ServerStoreOptions;
}

interface ServerStoreOptions {
  ttl?: number;
  cache?: boolean;
  revalidate?: number;
}

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}
```

## Performance Considerations

1. **State Updates**
   - Batched updates using React's batching mechanism
   - Immutable updates for predictable behavior
   - Selective re-rendering through memoization

2. **Memory Management**
   - Automatic cleanup of subscriptions
   - Efficient cache invalidation
   - Memory-conscious storage adapters

3. **Bundle Size**
   - Tree-shakeable exports
   - Code splitting for DevTools
   - Minimal dependencies

4. **Network Impact**
   - Optimistic updates
   - Intelligent caching
   - Batched server sync

## Security Considerations

1. **Data Safety**
   - Type-safe operations
   - Validation middleware
   - Sanitized persistence

2. **Server Security**
   - Secure state transfer
   - Protected endpoints
   - Rate limiting

3. **Client Security**
   - XSS prevention
   - CSRF protection
   - Safe storage

## Error Handling

```typescript
export class NextStateError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'NextStateError';
  }
}

export function assertValidState<T>(
  state: unknown
): asserts state is T {
  if (!state || typeof state !== 'object') {
    throw new NextStateError(
      'INVALID_STATE',
      'State must be a non-null object'
    );
  }
}

export function handleError(
  error: unknown,
  fallback: () => void
): void {
  if (error instanceof NextStateError) {
    console.error(
      `[NextState] ${error.code}: ${error.message}`,
      error.details
    );
  } else {
    console.error('[NextState] Unexpected error:', error);
  }
  fallback();
}
```

## Development Tools

```typescript
export class DevTools<T> {
  private store: Store<T>;
  private options: DevToolsOptions;
  private history: StateUpdate<T>[] = [];

  constructor(store: Store<T>, options: DevToolsOptions = {}) {
    this.store = store;
    this.options = options;
    this.setupDevTools();
  }

  private setupDevTools(): void {
    if (typeof window !== 'undefined') {
      (window as any).__NEXT_STATE_DEVTOOLS__ = {
        getState: () => this.store.getState(),
        getHistory: () => this.history,
        dispatch: (action: any) => this.dispatch(action)
      };
    }
  }

  private dispatch(action: any): void {
    switch (action.type) {
      case 'JUMP_TO_STATE':
        this.jumpToState(action.payload);
        break;
      case 'RESET':
        this.reset();
        break;
      default:
        console.warn(`Unknown devtools action: ${action.type}`);
    }
  }
}
```

## Migration System

```typescript
export class MigrationSystem<T> {
  private migrations: Record<number, Migration>;
  private currentVersion: number;

  constructor(
    migrations: Record<number, Migration>,
    currentVersion: number
  ) {
    this.migrations = migrations;
    this.currentVersion = currentVersion;
  }

  async migrate(
    state: unknown,
    targetVersion: number
  ): Promise<T> {
    let currentState = state;
    const versions = this.getMigrationPath(targetVersion);

    for (const version of versions) {
      const migration = this.migrations[version];
      if (!migration) {
        throw new NextStateError(
          'MISSING_MIGRATION',
          `Missing migration for version ${version}`
        );
      }

      currentState = await migration.up(currentState);
    }

    return currentState as T;
  }

  private getMigrationPath(target: number): number[] {
    const versions: number[] = [];
    let current = this.currentVersion;

    while (current < target) {
      versions.push(current + 1);
      current++;
    }

    return versions;
  }
}
```
