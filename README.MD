# nextjs-state

Type-safe state management for Next.js and React applications. Simple, lightweight, and performant.

[![npm version](https://badge.fury.io/js/nextjs-state.svg)](https://badge.fury.io/js/nextjs-state)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/nextjs-state)](https://bundlephobia.com/package/nextjs-state)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🎯 **Type-safe**: Full TypeScript support out of the box
- ⚡ **Lightweight**: Less than 1KB minified and gzipped
- 🔄 **Middleware**: Built-in logging and persistence middleware
- 💾 **Persistence**: Easy state persistence with localStorage
- 🎨 **Selectors**: Efficient state access with memoization
- 📦 **Zero dependencies**: Only React as a peer dependency

## Installation

```bash
npm install nextjs-state
# or
yarn add nextjs-state
# or
pnpm add nextjs-state
```

## Quick Start

```tsx
import { createNextState } from 'nextjs-state';

// 1. Define your state type
interface CounterState {
  count: number;
}

// 2. Create your state
const { useNextState } = createNextState<CounterState>({
  initialState: { count: 0 },
});

// 3. Use in your components
function Counter() {
  const { state, setState } = useNextState();

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => setState((prev) => ({ count: prev.count + 1 }))}>Increment</button>
    </div>
  );
}
```

## Complete Example

Here's a comprehensive example showcasing all features including state management, middleware, theming, and UI components:

```tsx
'use client';

import {
  createNextState,
  createLoggingMiddleware,
  createPersistenceMiddleware,
} from 'nextjs-state';

// Define complete app state
interface AppState {
  counter: {
    value: number;
    history: number[];
    lastUpdated: string;
  };
  todos: {
    items: Array<{
      id: number;
      text: string;
      completed: boolean;
      priority: 'low' | 'medium' | 'high';
    }>;
    filter: 'all' | 'active' | 'completed';
  };
  theme: {
    mode: 'light' | 'dark';
    fontSize: 'small' | 'medium' | 'large';
    accentColor: string;
  };
  user: {
    preferences: {
      notifications: boolean;
      autoSave: boolean;
    };
    lastActivity: string;
  };
}

// Create middleware stack
const loggingMiddleware = createLoggingMiddleware<AppState>();
const persistenceMiddleware = createPersistenceMiddleware<AppState>('app-state');

// Custom analytics middleware
const analyticsMiddleware = (state: AppState, nextState: AppState) => {
  if (state.counter.value !== nextState.counter.value) {
    console.log('Analytics: Counter changed', {
      from: state.counter.value,
      to: nextState.counter.value,
    });
  }
  return nextState;
};

// Custom validation middleware
const validationMiddleware = (state: AppState, nextState: AppState) => {
  if (nextState.counter.value < 0) {
    console.warn('Validation: Negative counter values not allowed');
    return state;
  }
  return nextState;
};

// Initialize state
const { useNextState } = createNextState<AppState>({
  initialState: {
    counter: {
      value: 0,
      history: [],
      lastUpdated: new Date().toISOString(),
    },
    todos: {
      items: [],
      filter: 'all',
    },
    theme: {
      mode: 'light',
      fontSize: 'medium',
      accentColor: '#3b82f6',
    },
    user: {
      preferences: {
        notifications: true,
        autoSave: true,
      },
      lastActivity: new Date().toISOString(),
    },
  },
  middleware: [loggingMiddleware, validationMiddleware, analyticsMiddleware, persistenceMiddleware],
});

// Action creators
const actions = {
  counter: {
    increment: (state: AppState) => ({
      ...state,
      counter: {
        value: state.counter.value + 1,
        history: [...state.counter.history, state.counter.value],
        lastUpdated: new Date().toISOString(),
      },
    }),
  },
  theme: {
    toggleMode: (state: AppState) => ({
      ...state,
      theme: {
        ...state.theme,
        mode: state.theme.mode === 'light' ? 'dark' : 'light',
      },
    }),
  },
  // ... more actions
};

// Example component
function Counter() {
  const { state, setState } = useNextState();

  return (
    <div className={state.theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white'}>
      <h2>Counter: {state.counter.value}</h2>
      <button onClick={() => setState(actions.counter.increment)}>Increment</button>
      <div>History: {state.counter.history.join(', ')}</div>
    </div>
  );
}
```

For a complete working example with all features and beautiful UI components, check out our [demo repository](https://github.com/yourusername/nextjs-state-demo).

## Advanced Usage

### Using with Next.js App Router

```tsx
// app/providers.tsx
'use client';

import { createNextState } from 'nextjs-state';

interface AppState {
  theme: 'light' | 'dark';
  user: {
    name: string;
    preferences: Record<string, any>;
  } | null;
}

export const { useNextState } = createNextState<AppState>({
  initialState: {
    theme: 'light',
    user: null,
  },
});

// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Using Selectors for Performance

```tsx
import { createNextState, useSelector } from 'nextjs-state';

interface DeepState {
  users: {
    list: Array<{
      id: number;
      name: string;
      settings: {
        theme: string;
        notifications: boolean;
      };
    }>;
    selectedId: number | null;
  };
}

const { useNextState } = createNextState<DeepState>({
  initialState: {
    users: {
      list: [],
      selectedId: null,
    },
  },
});

function SelectedUserSettings() {
  const state = useNextState();
  const selectedUser = useSelector(state, (s) =>
    s.users.list.find((u) => u.id === s.users.selectedId)
  );

  if (!selectedUser) return <div>No user selected</div>;

  return (
    <div>
      <h2>{selectedUser.name}'s Settings</h2>
      <p>Theme: {selectedUser.settings.theme}</p>
      <p>Notifications: {selectedUser.settings.notifications ? 'On' : 'Off'}</p>
    </div>
  );
}
```

## Best Practices

1. **State Organization**

   - Keep state minimal and focused
   - Split large state into smaller, focused states
   - Use TypeScript interfaces for better type safety

2. **Performance**

   - Use selectors for expensive computations
   - Avoid storing derived state
   - Split large components into smaller ones

3. **Middleware Usage**
   - Order middleware from most to least important
   - Use middleware for cross-cutting concerns
   - Keep middleware pure and side-effect free

## API Reference

### `createNextState<T>`

Creates a new state instance.

```tsx
function createNextState<T>(config: {
  initialState: T;
  middleware?: Array<(state: T, nextState: T) => T>;
}): {
  useNextState: () => {
    state: T;
    setState: (newState: T | ((prevState: T) => T)) => void;
  };
};
```

### `useSelector`

Creates a memoized selector.

```tsx
function useSelector<T, S>(hook: NextStateHook<T>, selector: (state: T) => S): S;
```

### Middleware Creators

#### `createLoggingMiddleware`

```tsx
function createLoggingMiddleware<T>(): (state: T, nextState: T) => T;
```

#### `createPersistenceMiddleware`

```tsx
function createPersistenceMiddleware<T>(key: string): (state: T, nextState: T) => T;
```

## License

MIT
