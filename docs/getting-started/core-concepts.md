# Core Concepts

## State Management Philosophy

Next State is built on several key principles:

1. **Type Safety First**
   - Full TypeScript support
   - Compile-time error detection
   - Type inference
   - Strict null checks

2. **Minimal API Surface**
   - Few core concepts to learn
   - Intuitive method names
   - Consistent patterns
   - Clear documentation

3. **Performance by Default**
   - Automatic batching
   - Selective re-rendering
   - Memory optimization
   - Bundle size control

4. **Developer Experience**
   - Helpful error messages
   - Development tools
   - Easy debugging
   - Clear patterns

## Core Concepts

### State Store

The state store is the central concept in Next State. It holds your application's state and provides methods to update it.

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
```

### State Updates

State updates are immutable and type-safe:

```typescript
// Direct update
store.setState({ user: newUser });

// Partial update
store.setState({ settings: { ...settings, theme: 'dark' } });

// Computed update
store.setState(state => ({
  todos: [...state.todos, newTodo]
}));
```

### Selectors

Selectors are pure functions that extract and compute data from the state:

```typescript
// Basic selector
const user = useNextState(state => state.user);

// Computed selector
const completedTodos = useNextState(state => 
  state.todos.filter(todo => todo.completed)
);

// Memoized selector
const todoStats = useNextState(state => ({
  total: state.todos.length,
  completed: state.todos.filter(todo => todo.completed).length,
  remaining: state.todos.filter(todo => !todo.completed).length
}), Object.is);
```

### Actions

Actions are reusable functions that update the state:

```typescript
// Synchronous action
const addTodo = (text: string) => 
  store.setState(state => ({
    todos: [...state.todos, { id: Date.now(), text, completed: false }]
  }));

// Async action
const fetchUser = async (id: string) => {
  const user = await api.getUser(id);
  store.setState({ user });
};

// Action with optimistic update
const toggleTodo = (id: string) => {
  // Optimistic update
  store.setState(state => ({
    todos: state.todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    )
  }));

  // Server sync
  api.updateTodo(id).catch(() => {
    // Rollback on error
    store.setState(state => ({
      todos: state.todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    }));
  });
};
```

### Middleware

Middleware intercepts state updates for side effects:

```typescript
const loggingMiddleware = {
  id: 'logger',
  before: (update) => {
    console.log('Before update:', update);
    return update;
  },
  after: (state) => {
    console.log('After update:', state);
  }
};

store.use(loggingMiddleware);
```

### Persistence

State can be persisted with automatic migration support:

```typescript
const store = create({
  initialState,
  options: {
    storage: {
      key: 'app-state',
      version: 2,
      migrations: {
        1: (oldState) => ({
          ...oldState,
          newField: 'default'
        })
      }
    }
  }
});
```

### Server Integration

Server components are supported with automatic state hydration:

```typescript
// Server component
function TodoList() {
  const [todos, setTodos] = useServerState(serverState);
  
  // Optimistic updates
  const addTodo = (text: string) => {
    setTodos(state => ({
      todos: [...state.todos, { id: 'temp', text }]
    }));
  };

  return (
    <ul>
      {todos.map(todo => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}

// Wrap with server state
export default withServerState(TodoList, config);
```

## Best Practices

### State Structure

1. **Keep State Normalized**
   ```typescript
   // Good
   interface State {
     users: { [id: string]: User };
     todos: { [id: string]: Todo };
     userTodos: { [userId: string]: string[] };
   }

   // Avoid
   interface State {
     users: Array<{
       user: User;
       todos: Todo[];
     }>;
   }
   ```

2. **Use Computed Data**
   ```typescript
   // Compute in selectors
   const userTodos = useNextState(state => {
     const user = state.users[userId];
     return state.userTodos[user.id]
       .map(id => state.todos[id]);
   });

   // Avoid storing computed data
   const userTodos = useNextState(state => 
     state.computedUserTodos[userId]
   );
   ```

3. **Type Everything**
   ```typescript
   interface Todo {
     id: string;
     text: string;
     completed: boolean;
     userId: string;
   }

   type TodoState = {
     todos: Record<string, Todo>;
     loading: boolean;
     error: Error | null;
   };
   ```

### Performance

1. **Use Selectors Wisely**
   ```typescript
   // Good: Specific selection
   const userName = useNextState(state => state.user.name);

   // Avoid: Over-selection
   const user = useNextState(state => state.user);
   ```

2. **Batch Updates**
   ```typescript
   // Good: Single update
   store.setState({
     user: newUser,
     settings: newSettings,
     lastUpdated: Date.now()
   });

   // Avoid: Multiple updates
   store.setState({ user: newUser });
   store.setState({ settings: newSettings });
   store.setState({ lastUpdated: Date.now() });
   ```

3. **Memoize Complex Computations**
   ```typescript
   const expensiveComputation = useNextState(
     state => computeExpensiveValue(state),
     (prev, next) => prev.id === next.id
   );
   ```

### Error Handling

1. **Use Type-Safe Errors**
   ```typescript
   throw new NextStateError({
     code: 'VALIDATION_ERROR',
     message: 'Invalid state update',
     details: { update }
   });
   ```

2. **Implement Error Boundaries**
   ```typescript
   <NextStateErrorBoundary
     fallback={<ErrorMessage />}
     onError={(error) => {
       logger.error('State error:', error);
     }}
   >
     <App />
   </NextStateErrorBoundary>
   ```

## Common Patterns

### Feature State

```typescript
// feature/state.ts
interface FeatureState {
  data: Data | null;
  loading: boolean;
  error: Error | null;
}

const initialState: FeatureState = {
  data: null,
  loading: false,
  error: null
};

export const featureStore = create({
  initialState,
  options: {
    devTools: true
  }
});
```

### Async Data Fetching

```typescript
function useAsyncData<T>(
  fetcher: () => Promise<T>
) {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
  }>({
    data: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;

    async function fetch() {
      try {
        const data = await fetcher();
        if (mounted) {
          setState({ data, loading: false, error: null });
        }
      } catch (error) {
        if (mounted) {
          setState({ data: null, loading: false, error });
        }
      }
    }

    fetch();

    return () => {
      mounted = false;
    };
  }, [fetcher]);

  return state;
}
```

### Form State

```typescript
function useFormState<T extends object>(initialState: T) {
  const [values, setValues] = useState(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const handleChange = (field: keyof T) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setValues(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleBlur = (field: keyof T) => () => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur
  };
}
```

## Advanced Topics

For more advanced usage, check out:
- [Middleware Guide](../guides/middleware.md)
- [Testing Guide](../guides/testing.md)
- [Performance Guide](../guides/performance.md)
- [Server Integration](../guides/server.md)
