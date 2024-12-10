# Next-State Codebase Documentation

This document provides an overview of each file in the next-state codebase and explains their purposes and functionalities.

## Core Files

### `src/core.ts`

The heart of the state management system that implements the core functionality:

- State container implementation
- React context setup
- Storage handling with persistence
- Provider component
- Core hooks (`useStore`, `useAction`)
- Server-side integration utilities
- State subscription system

Key features:

- Type-safe state management
- Built-in persistence
- Server component support
- React hooks integration
- State subscription system

### `src/types.ts`

Contains all TypeScript type definitions for the library:

- `NextStateMigration`: Type for handling state migrations between versions
- `NextStateMiddlewareConfig`: Configuration for middleware system
- `NextStateStorageConfig`: Configuration for storage mechanisms

### `src/store.ts`

Handles the store creation and management:

- Store initialization
- State updates
- Subscription management
- Storage integration

### `src/middleware-registry.ts`

Implements the middleware system:

- Middleware registration
- Execution pipeline
- Priority-based ordering
- Conditional execution

### `src/storage.ts`

Manages state persistence:

- Multiple storage backends (localStorage, sessionStorage, indexedDB)
- Migration system
- Error handling
- Retry mechanisms

### `src/error-boundary.tsx`

React error boundary component:

- Error catching for state operations
- Fallback UI
- Error reporting
- Recovery mechanisms

## Development Tools

### `src/dev-tools/`

Development utilities and debugging tools:

- State inspection
- Time-travel debugging
- Performance monitoring
- Development logging

## Example Usage

### `src/example_usage.md`

Contains example code and usage patterns:

- Basic state management
- Complex scenarios
- Best practices
- Performance optimization tips

## File Organization

The codebase follows a modular structure:

- Core state management in root files
- Type definitions in `types.ts`
- Middleware system in dedicated files
- Development tools in separate directory
- Clear separation of concerns

## Key Design Patterns

1. **Type Safety First**

   - Extensive TypeScript usage
   - Generic type parameters
   - Strict type checking

2. **Performance Optimization**

   - Minimal re-renders
   - Efficient state updates
   - Memoization where needed

3. **Developer Experience**

   - Clear API design
   - Comprehensive type definitions
   - Built-in development tools

4. **Flexibility**
   - Pluggable middleware system
   - Customizable storage
   - Extensible architecture

```

```
