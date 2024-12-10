# Core Concepts

Learn the fundamental principles behind next-state and how they work together to provide a powerful state management solution.

## Table of Contents

- [State Management Model](#state-management-model)
- [Actions](#actions)
- [Selectors](#selectors)
- [Middleware](#middleware)
- [Server Integration](#server-integration)

## State Management Model

next-state uses a unidirectional data flow model:

```typescript
// Simple visualization of data flow:
// Action → Middleware → State Update → UI Update
```

### State Structure

Your state is a single, immutable object:

```typescript
interface AppState {
  user: {
    name: string;
    email: string;
  } | null;
  settings: {
    theme: "light" | "dark";
    language: string;
  };
  ui: {
    isLoading: boolean;
    activeModal: string | null;
  };
}

const { Provider, useNextState } = createNextState<AppState>({
  initialState: {
    user: null,
    settings: {
      theme: "light",
      language: "en",
    },
    ui: {
      isLoading: false,
      activeModal: null,
    },
  },
});
```

### State Updates

All state updates are immutable and processed synchronously:

```typescript
// ❌ Don't modify state directly
state.user.name = "John"; // This will cause errors

// ✅ Use actions to update state
const updateUser = createNextAction((name: string) => (state) => ({
  user: { ...state.user, name },
}));
```

## Actions

Actions are the only way to modify state in next-state. They are pure functions that describe state changes.

### Synchronous Actions

```typescript
const increment = createNextAction(() => (state) => ({
  count: state.count + 1,
}));

// Usage
increment();
```

### Async Actions

```typescript
const fetchUser = createNextAction((userId: string) => async (state) => {
  // Set loading state
  state.ui.isLoading = true;

  try {
    const user = await api.getUser(userId);
    return {
      user,
      ui: { ...state.ui, isLoading: false },
    };
  } catch (error) {
    return {
      ui: {
        ...state.ui,
        isLoading: false,
        error: error.message,
      },
    };
  }
});

// Usage
await fetchUser("123");
```

## Selectors

Selectors efficiently access and derive state data. They automatically optimize re-renders.

### Basic Selectors

```typescript
function UserProfile() {
  // Only re-renders when user changes
  const user = useNextState((state) => state.user);

  // Only re-renders when theme changes
  const theme = useNextState((state) => state.settings.theme);

  return <div className={theme}>{user?.name}</div>;
}
```

### Computed Selectors

```typescript
function TodoList() {
  // Only re-renders when completed todos count changes
  const completedCount = useNextState(
    (state) => state.todos.filter((todo) => todo.completed).length
  );

  // Only re-renders when active todos change
  const activeTodos = useNextState((state) =>
    state.todos.filter((todo) => !todo.completed)
  );

  return (
    <div>
      <h2>Active Todos ({activeTodos.length})</h2>
      <p>Completed: {completedCount}</p>
    </div>
  );
}
```

## Middleware

Middleware intercepts state changes for side effects, logging, or modifications.

```typescript
// Logger middleware
const loggerMiddleware = {
  onStateChange: (prev, next) => {
    console.group("State Update");
    console.log("Previous:", prev);
    console.log("Next:", next);
    console.groupEnd();
  },
};

// Analytics middleware
const analyticsMiddleware = {
  onStateChange: (prev, next) => {
    if (prev.user !== next.user) {
      analytics.track("user_changed", {
        from: prev.user?.id,
        to: next.user?.id,
      });
    }
  },
};

// Add middleware
const { middlewareRegistry } = createNextState({
  initialState,
  options: {
    middleware: [loggerMiddleware, analyticsMiddleware],
  },
});
```

## Server Integration

next-state seamlessly integrates with Next.js server components and actions.

### Server Components

```typescript
// app/page.tsx
async function Page() {
  const initialData = await fetchInitialData();

  return (
    <Provider initialData={initialData}>
      <Content />
    </Provider>
  );
}
```

### Server Actions

```typescript
const fetchData = withNextServer("fetch-data", async () => {
  const data = await db.query();
  return { data };
});

// Usage in component
function DataComponent() {
  const data = useNextState((state) => state.data);

  useEffect(() => {
    fetchData();
  }, []);

  return <div>{/* Render data */}</div>;
}
```

## Best Practices

1. **Keep State Minimal**

   ```typescript
   // ❌ Don't store derived data
   const state = {
     todos: [],
     completedTodos: [], // Derived data
     activeCount: 0, // Derived data
   };

   // ✅ Use selectors for derived data
   const completedTodos = useNextState((state) =>
     state.todos.filter((todo) => todo.completed)
   );
   ```

2. **Organize Actions by Feature**

   ```typescript
   // users/actions.ts
   export const userActions = {
     update: createNextAction(...),
     delete: createNextAction(...),
     fetch: createNextAction(...)
   };
   ```

3. **Use TypeScript**
   ```typescript
   // Define strict types for your state
   interface AppState {
     user: User | null;
     settings: Settings;
     ui: UIState;
   }
   ```

## Next Steps

- Learn about [Advanced Patterns](../advanced/patterns.md)
- Explore [Performance Optimization](../advanced/performance.md)
- Set up [Testing](../guides/testing.md)

## Need Help?

- Join our [Discord](https://discord.gg/next-state)
- Check [GitHub Issues](https://github.com/raheesahmed/next-state/issues)
- Read our [FAQ](../faq.md)
