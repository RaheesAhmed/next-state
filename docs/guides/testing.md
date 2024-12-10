# Testing Guide

This guide covers essential testing patterns for Next State applications.

## Test Setup

### Basic Configuration

```typescript
import { create } from 'next-state';
import { render, act } from '@testing-library/react';

interface TestState {
  count: number;
  user: User | null;
  todos: Todo[];
}

const createTestStore = (initialState?: Partial<TestState>) => {
  const defaultState: TestState = {
    count: 0,
    user: null,
    todos: [],
    ...initialState
  };

  return create({
    initialState: defaultState,
    options: { devTools: false }
  });
};
```

### Test Utilities

```typescript
// State change tracker
const createStateTracker = <T>(store: Store<T>) => {
  const states: T[] = [];
  store.subscribe(state => states.push(state));
  return {
    getStates: () => states,
    getLastState: () => states[states.length - 1],
    clear: () => states.length = 0
  };
};

// Render counter
const createRenderCounter = () => {
  let renders = 0;
  return {
    Component: () => { renders++; return null; },
    getRenders: () => renders
  };
};
```

## Unit Tests

### State Updates

```typescript
describe('State Management', () => {
  let store: Store<TestState>;

  beforeEach(() => {
    store = createTestStore();
  });

  test('basic state update', () => {
    act(() => {
      store.setState({ count: 1 });
    });
    expect(store.getState().count).toBe(1);
  });

  test('computed update', () => {
    act(() => {
      store.setState(state => ({
        count: state.count + 1
      }));
    });
    expect(store.getState().count).toBe(1);
  });

  test('batch updates', () => {
    const tracker = createStateTracker(store);
    
    act(() => {
      store.setState({ count: 1 });
      store.setState({ count: 2 });
      store.setState({ count: 3 });
    });

    expect(tracker.getStates().length).toBe(1);
    expect(tracker.getLastState().count).toBe(3);
  });
});
```

### Selectors

```typescript
describe('Selectors', () => {
  test('basic selection', () => {
    const store = createTestStore({
      todos: [{ id: '1', completed: false }]
    });

    const TestComponent = () => {
      const completed = useNextState(state => 
        state.todos.filter(t => t.completed)
      );
      return <div>{completed.length}</div>;
    };

    const { container } = render(
      <StateProvider store={store}>
        <TestComponent />
      </StateProvider>
    );

    expect(container.textContent).toBe('0');
  });

  test('selector memoization', () => {
    const store = createTestStore();
    const selector = jest.fn(state => state.count);
    const counter = createRenderCounter();

    const TestComponent = () => {
      useNextState(selector);
      return <counter.Component />;
    };

    render(
      <StateProvider store={store}>
        <TestComponent />
      </StateProvider>
    );

    act(() => {
      store.setState({ user: null }); // Unrelated update
    });

    expect(selector).toHaveBeenCalledTimes(1);
    expect(counter.getRenders()).toBe(1);
  });
});
```

### Middleware

```typescript
describe('Middleware', () => {
  test('middleware execution', () => {
    const middleware = {
      id: 'test',
      before: jest.fn(update => update),
      after: jest.fn()
    };

    const store = createTestStore({
      options: { middleware: [middleware] }
    });

    act(() => {
      store.setState({ count: 1 });
    });

    expect(middleware.before).toHaveBeenCalled();
    expect(middleware.after).toHaveBeenCalled();
  });

  test('middleware error handling', () => {
    const errorMiddleware = {
      id: 'error',
      before: () => {
        throw new Error('Test error');
      }
    };

    const store = createTestStore({
      options: { middleware: [errorMiddleware] }
    });

    expect(() => {
      act(() => {
        store.setState({ count: 1 });
      });
    }).toThrow('Test error');
  });
});
```

## Integration Tests

### Component Integration

```typescript
describe('Component Integration', () => {
  test('component updates', () => {
    const store = createTestStore();

    const Counter = () => {
      const count = useNextState(state => state.count);
      return (
        <button onClick={() => store.setState({ count: count + 1 })}>
          Count: {count}
        </button>
      );
    };

    const { getByText } = render(
      <StateProvider store={store}>
        <Counter />
      </StateProvider>
    );

    act(() => {
      getByText(/Count: 0/).click();
    });

    expect(getByText(/Count: 1/)).toBeInTheDocument();
  });

  test('multiple components', () => {
    const store = createTestStore();
    const counter = createRenderCounter();

    const Display = () => {
      const count = useNextState(state => state.count);
      counter.Component();
      return <div>Count: {count}</div>;
    };

    const Controls = () => (
      <button onClick={() => store.setState({ count: 1 })}>
        Update
      </button>
    );

    const { getByText } = render(
      <StateProvider store={store}>
        <Display />
        <Controls />
      </StateProvider>
    );

    act(() => {
      getByText('Update').click();
    });

    expect(counter.getRenders()).toBe(2); // Initial + update
  });
});
```

### Async Operations

```typescript
describe('Async Operations', () => {
  test('async actions', async () => {
    const store = createTestStore();
    
    const fetchUser = async (id: string) => {
      const user = await api.getUser(id);
      store.setState({ user });
    };

    await act(async () => {
      await fetchUser('1');
    });

    expect(store.getState().user).toEqual({
      id: '1',
      name: 'Test'
    });
  });

  test('optimistic updates', async () => {
    const store = createTestStore({
      todos: [{ id: '1', completed: false }]
    });

    const toggleTodo = async (id: string) => {
      // Optimistic update
      store.setState(state => ({
        todos: state.todos.map(todo =>
          todo.id === id
            ? { ...todo, completed: !todo.completed }
            : todo
        )
      }));

      try {
        await api.updateTodo(id);
      } catch {
        // Rollback
        store.setState(state => ({
          todos: state.todos.map(todo =>
            todo.id === id
              ? { ...todo, completed: !todo.completed }
              : todo
          )
        }));
      }
    };

    await act(async () => {
      await toggleTodo('1');
    });

    expect(store.getState().todos[0].completed).toBe(true);
  });
});
```

## Performance Tests

```typescript
describe('Performance', () => {
  test('render optimization', () => {
    const store = createTestStore();
    const counter = createRenderCounter();

    const TestComponent = () => {
      useNextState(state => state.count);
      return <counter.Component />;
    };

    render(
      <StateProvider store={store}>
        <TestComponent />
      </StateProvider>
    );

    act(() => {
      store.setState({ user: null }); // Unrelated update
    });

    expect(counter.getRenders()).toBe(1); // Only initial render
  });

  test('batch performance', async () => {
    const store = createTestStore();
    const tracker = createStateTracker(store);

    act(() => {
      for (let i = 0; i < 100; i++) {
        store.setState({ count: i });
      }
    });

    expect(tracker.getStates().length).toBe(1); // Single batch update
    expect(tracker.getLastState().count).toBe(99);
  });
});
```

## Best Practices

1. **Isolate Tests**
```typescript
beforeEach(() => {
  jest.clearAllMocks();
  store = createTestStore();
});
```

2. **Use Act**
```typescript
await act(async () => {
  await asyncOperation();
});
```

3. **Test Edge Cases**
```typescript
test('edge cases', () => {
  expect(() => {
    store.setState(null as any);
  }).toThrow();
});
```

4. **Clean Up**
```typescript
afterEach(() => {
  cleanup();
  store.destroy();
});
```

5. **Mock Heavy Operations**
```typescript
jest.mock('./api', () => ({
  fetchData: jest.fn()
}));
```