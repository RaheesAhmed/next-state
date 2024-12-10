# Testing Guide

Learn how to effectively test your next-state implementations.

## Table of Contents

- [Setup](#setup)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [Testing Patterns](#testing-patterns)
- [Testing Utilities](#testing-utilities)
- [Common Scenarios](#common-scenarios)

## Setup

### Test Environment Setup

```typescript
// jest.config.js
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["@testing-library/jest-dom"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

// test-utils.ts
import { render } from "@testing-library/react";
import { createNextState } from "next-state";

export function createTestState<T extends object>(initialState: T) {
  const state = createNextState({ initialState });

  return {
    ...state,
    getState: () => state.useNextState((s) => s),
  };
}
```

## Unit Testing

### Testing Selectors

```typescript
describe("Selectors", () => {
  const { useNextState, Provider } = createTestState({
    todos: [
      { id: 1, text: "Test", completed: false },
      { id: 2, text: "Test 2", completed: true },
    ],
  });

  it("should select completed todos", () => {
    const { result } = renderHook(
      () => useNextState((state) => state.todos.filter((t) => t.completed)),
      { wrapper: Provider }
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe(2);
  });
});
```

### Testing Actions

```typescript
describe("Todo Actions", () => {
  const { createNextAction, useNextState, Provider } = createTestState({
    todos: [],
  });

  const addTodo = createNextAction((text: string) => (state) => ({
    todos: [...state.todos, { id: Date.now(), text, completed: false }],
  }));

  it("should add new todo", async () => {
    const { result } = renderHook(() => useNextState((state) => state.todos), {
      wrapper: Provider,
    });

    await act(async () => {
      await addTodo("New Todo");
    });

    expect(result.current).toHaveLength(1);
    expect(result.current[0].text).toBe("New Todo");
  });
});
```

### Testing Middleware

```typescript
describe("Analytics Middleware", () => {
  const mockAnalytics = {
    track: jest.fn(),
  };

  const analyticsMiddleware = {
    onStateChange: (prev: any, next: any) => {
      if (prev.user !== next.user) {
        mockAnalytics.track("user_changed", next.user);
      }
    },
  };

  const { Provider, createNextAction } = createTestState(
    {
      user: null,
    },
    {
      middleware: [analyticsMiddleware],
    }
  );

  it("should track user changes", async () => {
    const setUser = createNextAction((user: User) => () => ({ user }));

    await act(async () => {
      await setUser({ id: 1, name: "Test" });
    });

    expect(mockAnalytics.track).toHaveBeenCalledWith("user_changed", {
      id: 1,
      name: "Test",
    });
  });
});
```

## Integration Testing

### Testing Components with State

```typescript
describe("TodoList Component", () => {
  const { Provider } = createTestState({
    todos: [],
    filter: "all",
  });

  it("should render todos and handle updates", async () => {
    const { getByText, getByRole } = render(
      <Provider>
        <TodoList />
      </Provider>
    );

    // Add todo
    const input = getByRole("textbox");
    const addButton = getByText("Add");

    await userEvent.type(input, "New Todo");
    await userEvent.click(addButton);

    // Verify todo was added
    expect(getByText("New Todo")).toBeInTheDocument();

    // Toggle todo
    const checkbox = getByRole("checkbox");
    await userEvent.click(checkbox);

    // Verify todo was completed
    expect(checkbox).toBeChecked();
  });
});
```

### Testing Async Operations

```typescript
describe("User Authentication", () => {
  const mockApi = {
    login: jest.fn(),
  };

  const { Provider, createNextAction } = createTestState({
    user: null,
    loading: false,
    error: null,
  });

  const login = createNextAction(
    (credentials: Credentials) => async (state) => {
      state.loading = true;
      try {
        const user = await mockApi.login(credentials);
        return { user, loading: false, error: null };
      } catch (error) {
        return { loading: false, error: error.message };
      }
    }
  );

  it("should handle successful login", async () => {
    mockApi.login.mockResolvedValueOnce({ id: 1, name: "Test" });

    const { result } = renderHook(() => useNextState((s) => s), {
      wrapper: Provider,
    });

    await act(async () => {
      await login({ email: "test@test.com", password: "password" });
    });

    expect(result.current.user).toEqual({ id: 1, name: "Test" });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should handle login failure", async () => {
    mockApi.login.mockRejectedValueOnce(new Error("Invalid credentials"));

    const { result } = renderHook(() => useNextState((s) => s), {
      wrapper: Provider,
    });

    await act(async () => {
      await login({ email: "test@test.com", password: "wrong" });
    });

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("Invalid credentials");
  });
});
```

## Testing Patterns

### Testing Persistence

```typescript
describe("State Persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should persist and rehydrate state", () => {
    const { Provider } = createTestState(
      {
        counter: 0,
      },
      {
        persist: {
          storage: "localStorage",
          key: "test-state",
        },
      }
    );

    // First render
    const { result, rerender } = renderHook(
      () => useNextState((s) => s.counter),
      { wrapper: Provider }
    );

    act(() => {
      // Update state
      result.current.increment();
    });

    // Unmount and remount
    rerender();

    // State should be rehydrated
    expect(result.current).toBe(1);
  });
});
```

### Testing DevTools

```typescript
describe("DevTools", () => {
  it("should track state history", () => {
    const { Provider, useNextState } = createTestState(
      {
        count: 0,
      },
      {
        devTools: true,
      }
    );

    const { result } = renderHook(
      () => {
        const state = useNextState((s) => s);
        const devTools = useDevTools();
        return { state, devTools };
      },
      { wrapper: Provider }
    );

    act(() => {
      result.current.state.increment();
    });

    expect(result.current.devTools.history).toHaveLength(2);
    expect(result.current.devTools.history[1].state.count).toBe(1);
  });
});
```

## Testing Utilities

```typescript
// test-utils.ts
export function createMockMiddleware() {
  return {
    onStateChange: jest.fn(),
    onError: jest.fn(),
    onInit: jest.fn(),
  };
}

export function waitForStateUpdate(callback: () => void) {
  return act(async () => {
    await callback();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}
```

## Common Scenarios

### Testing Form State

```typescript
describe("Form State", () => {
  it("should handle form updates and validation", async () => {
    const { result } = renderHook(() => {
      const form = useFormState({
        initialValues: { email: "", password: "" },
        validate: (values) => {
          const errors: Record<string, string> = {};
          if (!values.email) errors.email = "Required";
          return errors;
        },
      });
      return form;
    });

    await act(async () => {
      await result.current.setFieldValue("email", "test@test.com");
    });

    expect(result.current.values.email).toBe("test@test.com");
    expect(result.current.errors.email).toBeUndefined();
  });
});
```

## Next Steps

- Explore [Performance Testing](../advanced/performance.md)
- Learn about [Error Handling](../guides/error-handling.md)
- Check out [Testing Examples](../examples/testing/README.md)
