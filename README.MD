# next-state

<div align="center">
 
  <h3>Type-safe state management built for Next.js</h3>
</div>

![npm version](https://img.shields.io/npm/v/next-state)
![Bundle Size](https://img.shields.io/bundlephobia/minzip/next-state)
![Types](https://img.shields.io/npm/types/next-state)
![License](https://img.shields.io/npm/l/next-state)

## Features

- 🎯 **Type-Safe by Default**: Full TypeScript support with zero configuration
- 🚀 **Zero Config**: Works immediately with smart defaults
- ⚡ **Tiny Bundle**: ~4KB minified + gzipped
- 🔄 **Server Ready**: Built for Next.js server components and actions
- 💾 **Built-in Persistence**: Optional state persistence with migrations
- 🛠️ **Developer Tools**: Time-travel debugging in development
- 🎮 **Middleware System**: Powerful side effects and plugins

## Quick Start

```bash
npm install next-state
```

### Basic Usage

```typescript
// app/state.ts
import { createNextState } from "next-state";

interface AppState {
  user: User | null;
  theme: "light" | "dark";
  settings: Settings;
}

export const { Provider, useNextState, createNextAction } =
  createNextState<AppState>({
    initialState: {
      user: null,
      theme: "light",
      settings: defaultSettings,
    },
  });

// app/layout.tsx
import { Provider } from "./state";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}

// app/components/Header.tsx
import { useNextState, createNextAction } from "../state";

export function Header() {
  const user = useNextState((state) => state.user);
  const theme = useNextState((state) => state.theme);

  const toggleTheme = createNextAction(() => (state) => ({
    theme: state.theme === "light" ? "dark" : "light",
  }));

  return (
    <header>
      <h1>Welcome {user?.name}</h1>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </header>
  );
}
```

## Core Concepts

### State Management

next-state uses a unidirectional data flow:

1. State is defined with TypeScript interfaces
2. Components subscribe to state changes using `useNextState`
3. Actions modify state through `createNextAction`
4. Middleware can intercept state changes
5. Changes flow back to components

### Type Safety

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

interface AppState {
  user: User | null;
  settings: {
    theme: "light" | "dark";
    language: string;
  };
}

// Type errors caught at compile time
const wrongUpdate = createNextAction(() => (state) => ({
  user: {
    id: 123, // Error: Type 'number' is not assignable to type 'string'
    name: "John", // Error: Missing property 'email'
  },
}));
```

### Selectors

```typescript
// Simple selector
const user = useNextState((state) => state.user);

// Computed selector
const isAdmin = useNextState((state) => state.user?.role === "admin");

// Multiple values
const { name, email } = useNextState((state) => ({
  name: state.user?.name,
  email: state.user?.email,
}));

// With custom comparison
const settings = useNextState((state) => state.settings, {
  compare: (a, b) => a.theme === b.theme && a.language === b.language,
});
```

### Actions

```typescript
// Simple action
const setTheme = createNextAction((theme: "light" | "dark") => (state) => ({
  theme,
}));

// Async action
const fetchUser = createNextAction((userId: string) => async (state) => {
  state.loading = true;
  try {
    const user = await api.getUser(userId);
    return { user, loading: false };
  } catch (error) {
    return { error: error.message, loading: false };
  }
});

// Action with validation
const updateUser = createNextAction((update: Partial<User>) => (state) => {
  if (!state.user) throw new Error("No user logged in");
  return {
    user: { ...state.user, ...update },
  };
});
```

## Server Integration

### Server Components

```typescript
// app/page.tsx
import { Provider } from "./state";

async function getData() {
  const res = await fetch("https://api.example.com/data");
  return res.json();
}

export default async function Page() {
  // Fetch initial data during SSR
  const initialData = await getData();

  return (
    <Provider initialData={initialData}>
      <PageContent />
    </Provider>
  );
}
```

### Server Actions

```typescript
// app/actions.ts
import { withNextServer } from "next-state";

// Type-safe server action
export const fetchUserData = withNextServer(
  "fetch-user",
  async (userId: string) => {
    "use server";
    const user = await db.users.findUnique({
      where: { id: userId },
    });
    return { user };
  }
);

// Usage in component
function UserProfile({ userId }: { userId: string }) {
  const user = useNextState((state) => state.user);

  useEffect(() => {
    fetchUserData(userId);
  }, [userId]);

  return <div>{user?.name}</div>;
}
```

### SSR Hydration

```typescript
// state/index.ts
const { Provider } = createNextState<AppState>({
  initialState,
  options: {
    // Handle hydration mismatches
    hydration: {
      strategy: "client-first", // or 'server-first'
      onMismatch: (server, client) => {
        // Resolve hydration conflicts
        return { ...server, ...client };
      },
    },
  },
});

// Example with loading states
function AsyncComponent() {
  const { data, loading } = useNextState((state) => ({
    data: state.data,
    loading: state.loading,
  }));

  if (loading) {
    return <div>Loading...</div>;
  }

  return <div>{data}</div>;
}
```

### Edge Runtime Support

```typescript
// middleware.ts
import { createNextState } from "next-state/edge";

export const config = {
  runtime: "edge",
};

export default function middleware(req: Request) {
  const state = createNextState({
    initialState: {},
    options: {
      storage: "memory", // Edge-compatible storage
    },
  });

  // Handle edge logic
}
```

### Real-time Updates

```typescript
// state/realtime.ts
const { Provider, middlewareRegistry } = createNextState({
  initialState,
  options: {
    realtime: {
      // WebSocket configuration
      endpoint: "ws://api.example.com",
      reconnect: true,
      onMessage: (message) => {
        // Handle real-time updates
      },
    },
  },
});

// Middleware for real-time sync
middlewareRegistry.add({
  id: "realtime-sync",
  onStateChange: async (prev, next) => {
    if (prev.user !== next.user) {
      await socket.emit("user:update", next.user);
    }
  },
});
```

### Cache Management

```typescript
// Advanced caching strategies
const fetchData = withNextServer(
  "cached-data",
  async () => {
    const data = await db.query();
    return { data };
  },
  {
    cache: {
      ttl: 60, // Cache for 60 seconds
      revalidate: "background", // Background revalidation
      staleWhileRevalidate: true,
    },
  }
);

// Cache invalidation
export const invalidateCache = createNextAction(
  (key: string) => async (state) => {
    await cache.invalidate(key);
    return state;
  }
);
```

### Error Boundaries

```typescript
// app/error.tsx
"use client";

import { StateErrorBoundary } from "next-state";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <StateErrorBoundary
      fallback={
        <div>
          <h2>Something went wrong!</h2>
          <button onClick={reset}>Try again</button>
        </div>
      }
    >
      {/* Your app content */}
    </StateErrorBoundary>
  );
}
```

### Data Prefetching

```typescript
// Prefetch data for faster page loads
export const prefetchUser = withNextServer(
  "prefetch-user",
  async (userId: string) => {
    const user = await db.users.findUnique({
      where: { id: userId },
    });

    // Warm up the cache
    await cache.set(`user:${userId}`, user);

    return { user };
  }
);

// Link with prefetch
function UserLink({ userId }: { userId: string }) {
  return (
    <Link href={`/users/${userId}`} onMouseEnter={() => prefetchUser(userId)}>
      View Profile
    </Link>
  );
}
```

### Server-Side Validation

```typescript
// Validate state updates on the server
const updateUser = withNextServer(
  "update-user",
  async (update: Partial<User>) => {
    "use server";

    // Zod validation
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      role: z.enum(["user", "admin"]),
    });

    try {
      const validated = schema.parse(update);
      const user = await db.users.update({
        where: { id: update.id },
        data: validated,
      });
      return { user };
    } catch (error) {
      return { error: error.errors };
    }
  }
);
```

## Middleware & Plugins

### Middleware System

```typescript
interface Middleware<T> {
  id?: string;
  priority?: number;
  onStateChange?: (prev: T, next: T) => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;
  onInit?: (state: T) => void | Promise<void>;
}

// Basic middleware setup
const { middlewareRegistry } = createNextState({
  initialState,
  options: {
    middleware: [loggerMiddleware, persistMiddleware, analyticsMiddleware],
  },
});
```

### Built-in Middleware

#### Storage Persistence

```typescript
// Persistence with localStorage
const persistMiddleware = {
  id: "persist",
  priority: 100,
  onStateChange: async (_, next) => {
    localStorage.setItem("app-state", JSON.stringify(next));
  },
  onInit: async () => {
    const saved = localStorage.getItem("app-state");
    if (saved) return JSON.parse(saved);
  },
};

// Advanced persistence with migrations
const persistWithMigrations = {
  id: "persist-migrations",
  version: 2,
  migrations: [
    {
      version: 2,
      migrate: (oldState) => ({
        ...oldState,
        newFeature: defaultValue,
      }),
    },
  ],
  storage: {
    type: "indexedDB",
    database: "my-app",
    table: "state",
  },
};
```

#### Logger Middleware

```typescript
const loggerMiddleware = {
  id: "logger",
  onStateChange: (prev, next) => {
    console.group("State Update");
    console.log("Previous:", prev);
    console.log("Next:", next);
    console.log("Diff:", getDiff(prev, next));
    console.groupEnd();
  },
  onError: (error) => {
    console.error("State Error:", error);
  },
};

// Development-only logger
const devLogger = {
  ...loggerMiddleware,
  enabled: process.env.NODE_ENV === "development",
};
```

#### Analytics Middleware

```typescript
const analyticsMiddleware = {
  id: "analytics",
  onStateChange: (prev, next) => {
    // Track specific state changes
    if (prev.user !== next.user) {
      analytics.track("user_updated", {
        previous: prev.user?.id,
        current: next.user?.id,
      });
    }

    // Track feature usage
    if (prev.features !== next.features) {
      const enabledFeatures = getEnabledFeatures(next.features);
      analytics.track("features_changed", { enabledFeatures });
    }
  },
};
```

### Custom Middleware Patterns

#### Validation Middleware

```typescript
const createValidationMiddleware = (schema: ZodSchema) => ({
  id: "validation",
  priority: 99, // Run before persistence
  onStateChange: (_, next) => {
    try {
      schema.parse(next);
    } catch (error) {
      throw new Error(`Invalid state: ${error.message}`);
    }
  },
});

// Usage
middlewareRegistry.add(createValidationMiddleware(AppStateSchema));
```

#### Undo/Redo Middleware

```typescript
const createHistoryMiddleware = (maxHistory = 10) => {
  const past: any[] = [];
  const future: any[] = [];

  return {
    id: "history",
    onStateChange: (prev) => {
      past.push(prev);
      if (past.length > maxHistory) past.shift();
      future.length = 0;
    },
    actions: {
      undo: () => {
        if (past.length === 0) return;
        const previous = past.pop()!;
        future.push(previous);
        return previous;
      },
      redo: () => {
        if (future.length === 0) return;
        const next = future.pop()!;
        past.push(next);
        return next;
      },
    },
  };
};
```

#### Performance Monitoring

```typescript
const performanceMiddleware = {
  id: "performance",
  onStateChange: (prev, next) => {
    const start = performance.now();

    return () => {
      const duration = performance.now() - start;
      if (duration > 16.67) {
        // Longer than one frame
        console.warn("Slow state update:", {
          duration,
          stateDiff: getDiff(prev, next),
        });
      }
    };
  },
};
```

### Plugin System

```typescript
interface Plugin<T> {
  middleware?: Middleware<T>[];
  enhancers?: StateEnhancer<T>[];
  devtools?: DevToolsConfig;
}

// Create plugin
const createPlugin = <T>(config: PluginConfig<T>): Plugin<T> => {
  return {
    middleware: [
      // Plugin-specific middleware
    ],
    enhancers: [
      // State enhancers
    ],
    devtools: {
      // DevTools configuration
    },
  };
};

// Usage
const { Provider } = createNextState({
  initialState,
  plugins: [
    persistencePlugin(),
    analyticsPlugin({
      provider: "segment",
    }),
    customPlugin(),
  ],
});
```

### Middleware Composition

```typescript
// Compose multiple middleware
const composeMiddleware = (...middleware: Middleware[]) => ({
  id: "composed",
  onStateChange: async (prev, next) => {
    for (const m of middleware) {
      if (m.onStateChange) {
        await m.onStateChange(prev, next);
      }
    }
  },
  onError: (error) => {
    middleware.forEach((m) => m.onError?.(error));
  },
});

// Usage
middlewareRegistry.add(
  composeMiddleware(loggerMiddleware, validationMiddleware, analyticsMiddleware)
);
```

### Testing Middleware

```typescript
describe("Validation Middleware", () => {
  const schema = z.object({
    count: z.number().min(0),
  });

  const middleware = createValidationMiddleware(schema);

  it("should validate state updates", () => {
    expect(() => {
      middleware.onStateChange?.({ count: 0 }, { count: -1 });
    }).toThrow("Invalid state");

    expect(() => {
      middleware.onStateChange?.({ count: 0 }, { count: 1 });
    }).not.toThrow();
  });
});
```

## Advanced Features & Performance

### DevTools Integration

```typescript
// Enable DevTools
const { Provider } = createNextState({
  initialState,
  options: {
    devTools: {
      enabled: process.env.NODE_ENV === "development",
      position: "bottom-right",
      features: ["history", "export", "import", "filter"],
      // Custom DevTools UI
      renderPanel: (props) => <CustomDevTools {...props} />,
    },
  },
});

// Custom DevTools Component
function CustomDevTools({ state, history, dispatch }) {
  return (
    <div className="devtools-panel">
      <div className="state-tree">
        <JSONTree data={state} />
      </div>
      <div className="history">
        {history.map((entry, index) => (
          <button key={entry.id} onClick={() => dispatch("TIME_TRAVEL", index)}>
            {entry.actionType}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Performance Optimizations

#### Selective Updates

```typescript
// Optimized selectors
function TodoList() {
  // Only re-renders when todos change
  const todos = useNextState((state) => state.todos, {
    compare: (prev, next) => {
      // Custom comparison logic
      return (
        prev.length === next.length && prev.every((t, i) => t.id === next[i].id)
      );
    },
  });

  // Computed values are memoized
  const stats = useNextState((state) => ({
    total: state.todos.length,
    completed: state.todos.filter((t) => t.completed).length,
    remaining: state.todos.filter((t) => !t.completed).length,
  }));

  return (
    <div>
      <TodoStats stats={stats} />
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </div>
  );
}
```

#### State Splitting

```typescript
// Split large state into domains
const { Provider: UserProvider } = createNextState({
  initialState: userInitialState,
});

const { Provider: UIProvider } = createNextState({
  initialState: uiInitialState,
});

// Compose providers
function AppProviders({ children }) {
  return (
    <UserProvider>
      <UIProvider>{children}</UIProvider>
    </UserProvider>
  );
}

// Access state from different domains
function UserProfile() {
  const user = useNextState((state) => state.user);
  const { theme } = useUIState((state) => ({
    theme: state.theme,
  }));

  return <div className={theme}>{user.name}</div>;
}
```

### Advanced Patterns

#### Action Creators Factory

```typescript
// Type-safe action creators
const createActions = <State extends object>() => {
  return {
    setLoading: (loading: boolean) => (state: State) => ({ loading }),

    updateField:
      <K extends keyof State>(field: K, value: State[K]) =>
      (state: State) => ({ [field]: value }),

    asyncAction:
      <T>(promise: Promise<T>, field: keyof State) =>
      async (state: State) => {
        state.loading = true;
        try {
          const result = await promise;
          return {
            [field]: result,
            loading: false,
          };
        } catch (error) {
          return {
            error: error.message,
            loading: false,
          };
        }
      },
  };
};

// Usage
const actions = createActions<AppState>();
const setLoading = createNextAction(actions.setLoading);
const updateUser = createNextAction(actions.updateField("user"));
```

#### State Machines

```typescript
type Status = "idle" | "loading" | "success" | "error";

const createStateMachine = <T>(config: {
  initial: Status;
  states: Record<
    Status,
    {
      on: Record<string, Status>;
      effect?: (state: T) => Promise<void>;
    }
  >;
}) => {
  return createNextAction(
    (event: string) => async (state: T & { status: Status }) => {
      const currentState = config.states[state.status];
      const nextStatus = currentState.on[event];

      if (nextStatus) {
        const nextState = config.states[nextStatus];
        if (nextState.effect) {
          await nextState.effect(state);
        }
        return { status: nextStatus };
      }

      return state;
    }
  );
};

// Usage
const fetchMachine = createStateMachine({
  initial: "idle",
  states: {
    idle: {
      on: { FETCH: "loading" },
    },
    loading: {
      on: {
        SUCCESS: "success",
        ERROR: "error",
      },
      effect: async (state) => {
        // Fetch data
      },
    },
    success: {
      on: { RETRY: "loading" },
    },
    error: {
      on: { RETRY: "loading" },
    },
  },
});
```

#### Form Management

```typescript
// Form state management
const createForm = <T extends object>(config: {
  initialValues: T;
  validate?: (values: T) => Record<keyof T, string>;
  onSubmit: (values: T) => Promise<void>;
}) => {
  type FormState = {
    values: T;
    errors: Partial<Record<keyof T, string>>;
    touched: Partial<Record<keyof T, boolean>>;
    isSubmitting: boolean;
  };

  const { Provider, useNextState, createNextAction } =
    createNextState<FormState>({
      initialState: {
        values: config.initialValues,
        errors: {},
        touched: {},
        isSubmitting: false,
      },
    });

  const setField = createNextAction(
    (field: keyof T, value: T[keyof T]) => (state) => ({
      values: { ...state.values, [field]: value },
      touched: { ...state.touched, [field]: true },
    })
  );

  const submit = createNextAction(() => async (state) => {
    state.isSubmitting = true;
    try {
      await config.onSubmit(state.values);
      return {
        isSubmitting: false,
        errors: {},
      };
    } catch (error) {
      return {
        isSubmitting: false,
        errors: { submit: error.message },
      };
    }
  });

  return {
    Provider,
    useForm: () => ({
      values: useNextState((state) => state.values),
      errors: useNextState((state) => state.errors),
      touched: useNextState((state) => state.touched),
      isSubmitting: useNextState((state) => state.isSubmitting),
      setField,
      submit,
    }),
  };
};

// Usage
const { Provider, useForm } = createForm({
  initialValues: {
    email: "",
    password: "",
  },
  validate: (values) => {
    const errors = {};
    if (!values.email) errors.email = "Required";
    return errors;
  },
  onSubmit: async (values) => {
    await api.login(values);
  },
});
```

### Error Handling

```typescript
// Global error boundary
const ErrorBoundary = createNextState({
  initialState: {
    error: null as Error | null,
    errorInfo: null as React.ErrorInfo | null,
  },
  options: {
    onError: (error, errorInfo) => {
      // Log to error reporting service
      errorReporting.capture(error, errorInfo);
    },
  },
});

// Component error handling
const fetchWithRetry = createNextAction(() => async (state) => {
  let attempts = 3;
  while (attempts > 0) {
    try {
      const data = await api.fetch();
      return { data, error: null };
    } catch (error) {
      attempts--;
      if (attempts === 0) {
        return { error: error.message };
      }
      await sleep(1000);
    }
  }
});
```
