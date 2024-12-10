# nextjs-state

<div align="center">
  <h3>Type-safe state management built for Next.js</h3>
</div>

![License](https://img.shields.io/npm/l/nextjs-state)
![Types](https://img.shields.io/npm/types/nextjs-state)
![npm](https://img.shields.io/npm/v/nextjs-state)
![npm bundle size](https://img.shields.io/bundlephobia/minzip/nextjs-state)
[![GitHub issues](https://img.shields.io/github/issues/RaheesAhmed/next-state)](https://github.com/RaheesAhmed/next-state/issues)
[![GitHub stars](https://img.shields.io/github/stars/RaheesAhmed/next-state)](https://github.com/RaheesAhmed/next-state/stargazers)

## Features

- 🎯 **Type-Safe**: Full TypeScript support with zero configuration
- 🚀 **Simple API**: Intuitive hooks-based API
- ⚡ **Lightweight**: ~4KB minified + gzipped
- 💾 **Built-in Persistence**: Optional localStorage persistence
- 🔄 **Middleware System**: Extensible with custom middleware
- 🛠️ **Developer Tools**: Time-travel debugging (coming soon)

## Installation

```bash
npm install nextjs-state
# or
yarn add nextjs-state
# or
pnpm add nextjs-state
```

## Quick Start

```typescript
// state/index.ts
import { createNextState } from 'nextjs-state';

interface AppState {
  count: number;
  lastUpdated: string;
}

export const { Provider, useNextState } = createNextState<AppState>({
  initialState: {
    count: 0,
    lastUpdated: new Date().toISOString(),
  },
});

// app/layout.tsx
import { Provider } from './state';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}

// app/components/Counter.tsx
import { useNextState } from '../state';

export function Counter() {
  const { state, setState } = useNextState((state) => ({
    count: state.count,
    lastUpdated: state.lastUpdated,
  }));

  const increment = () => {
    setState({
      count: state.count + 1,
      lastUpdated: new Date().toISOString(),
    });
  };

  return (
    <div>
      <p>Count: {state.count}</p>
      <p>Last Updated: {new Date(state.lastUpdated).toLocaleString()}</p>
      <button onClick={increment}>Increment</button>
    </div>
  );
}
```

## Core Concepts

### State Management

nextjs-state uses a simple and intuitive state management pattern:

1. Define your state with TypeScript interfaces
2. Create a state instance with `createNextState`
3. Wrap your app with the `Provider`
4. Use `useNextState` hook to access and update state

### Type Safety

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
}

// Type errors caught at compile time
const wrongUpdate = setState({
  user: {
    id: 123, // Error: Type 'number' is not assignable to type 'string'
    name: 'John', // Error: Missing property 'email'
  },
});
```

### State Updates

```typescript
// Simple update
setState({ count: count + 1 });

// Update with previous state
setState((prev) => ({
  count: prev.count + 1,
}));

// Async update
const fetchUser = async (userId: string) => {
  const user = await api.getUser(userId);
  setState({ user });
};
```

### Middleware

```typescript
const loggerMiddleware = {
  id: 'logger',
  onStateChange: (prev, next) => {
    console.log('State updated:', { prev, next });
  },
  onError: (error) => {
    console.error('State error:', error);
  },
};

const { Provider } = createNextState({
  initialState,
  options: {
    middleware: [loggerMiddleware],
  },
});
```

### Persistence

State is automatically persisted to localStorage by default. You can access the storage API directly:

```typescript
const { Provider, useNextState } = createNextState({
  initialState: {
    count: 0,
  },
});

// State will be automatically persisted to localStorage
```

## API Reference

### `createNextState<T>`

Creates a new state instance with the provided configuration.

```typescript
const { Provider, useNextState } = createNextState<AppState>({
  initialState: {
    // Your initial state
  },
  options?: {
    middleware?: NextStateMiddleware<T>[];
  },
});
```

### `useNextState`

Hook to access and update state.

```typescript
const { state, setState } = useNextState((state) => ({
  // Select state properties
}));
```

### `NextStateMiddleware`

Interface for creating custom middleware.

```typescript
interface NextStateMiddleware<T> {
  id?: string;
  priority?: number;
  onStateChange?: (prev: T, next: T) => void | Promise<void>;
  onError?: (error: Error) => void;
}
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT © [Rahees Ahmed]
