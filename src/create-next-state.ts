import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
  type ComponentType,
  type FC,
} from "react";
import { createStorage } from "./storage";
import { setupDevTools } from "./devtools";
import type {
  NextStateConfig,
  NextStateMiddleware,
  NextStateError,
} from "./types";

export function createNextState<T extends object>(config: NextStateConfig<T>) {
  const StateContext = createContext<{
    state: T;
    setState: (update: Partial<T> | ((prev: T) => Partial<T>)) => void;
    setStateAsync: (
      update: Promise<Partial<T>> | ((prev: T) => Promise<Partial<T>>)
    ) => Promise<void>;
  } | null>(null);

  // Create storage instance based on config
  const storage = createStorage(config.options?.persist);

  // Setup DevTools if enabled
  const devTools =
    config.options?.devTools &&
    typeof window !== "undefined" &&
    process.env.NODE_ENV === "development"
      ? setupDevTools<T>()
      : null;

  // Error Boundary Component
  class NextStateErrorBoundary extends React.Component<
    { children: ReactNode },
    { hasError: boolean }
  > {
    constructor(props: { children: ReactNode }) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
      return { hasError: true };
    }

    componentDidCatch(error: Error) {
      console.error("NextState Error:", error);
    }

    render() {
      if (this.state.hasError) {
        return <div>Something went wrong in NextState.</div>;
      }
      return this.props.children;
    }
  }

  function NextStateProvider({
    children,
    initialData,
    middleware = config.options?.middleware || [],
  }: {
    children: ReactNode;
    initialData?: Partial<T>;
    middleware?: NextStateMiddleware<T>[];
  }) {
    const [state, setStateInternal] = useState<T>(() => ({
      ...config.initialState,
      ...initialData,
    }));

    // Hydration tracking
    const [isHydrated, setIsHydrated] = useState(!config.options?.persist);

    // Load persisted state
    useEffect(() => {
      async function hydrate() {
        if (config.options?.persist) {
          const saved = await storage.get();
          if (saved) {
            setStateInternal((prev) => ({ ...prev, ...saved }));
          }
          setIsHydrated(true);
        }
      }
      hydrate();
    }, []);

    // Initialize middleware
    useEffect(() => {
      middleware.forEach((mw) => mw.onInit?.(state));
    }, []);

    // State update with middleware and persistence
    const setState = useCallback(
      async (update: Partial<T> | ((prev: T) => Partial<T>)) => {
        setStateInternal((prev) => {
          const nextUpdate =
            typeof update === "function" ? update(prev) : update;
          const next = { ...prev, ...nextUpdate };

          // Execute middleware
          middleware.forEach((mw) => {
            try {
              mw.onStateChange?.(prev, next);
            } catch (error) {
              mw.onError?.(error as Error);
            }
          });

          // Update DevTools
          devTools?.send("setState", { prev, next });

          // Persist state
          if (config.options?.persist) {
            storage.set(next);
          }

          return next;
        });
      },
      []
    );

    // Async state updates
    const setStateAsync = useCallback(
      async (
        update: Promise<Partial<T>> | ((prev: T) => Promise<Partial<T>>)
      ) => {
        const resolvedUpdate =
          typeof update === "function" ? await update(state) : await update;

        await setState(resolvedUpdate);
      },
      [state, setState]
    );

    // Memoized context value
    const value = useMemo(
      () => ({
        state,
        setState,
        setStateAsync,
      }),
      [state, setState, setStateAsync]
    );

    // Prevent hydration mismatch
    if (!isHydrated) {
      return null;
    }

    return (
      <StateContext.Provider value={value}>{children}</StateContext.Provider>
    );
  }

  // HOC for automatic provider wrapping
  function withNextStateProvider<P extends object>(
    Component: ComponentType<P>
  ) {
    return function WrappedComponent(props: P) {
      return (
        <NextStateErrorBoundary>
          <NextStateProvider>
            <Component {...props} />
          </NextStateProvider>
        </NextStateErrorBoundary>
      );
    };
  }

  // Enhanced useNextState with Suspense support
  function useNextState<S>(
    selector: (state: T) => S | Promise<S>,
    deps: any[] = []
  ): S {
    const context = useContext(StateContext);
    if (!context) {
      throw {
        code: "PROVIDER_MISSING",
        message: "useNextState must be used within NextStateProvider",
      } as NextStateError;
    }

    const [data, setData] = useState<S | null>(null);

    useEffect(() => {
      const result = selector(context.state);
      if (result instanceof Promise) {
        if (config.options?.suspense) {
          throw result; // Let Suspense handle it
        } else {
          result.then(setData);
        }
      } else {
        setData(result);
      }
    }, [context.state, ...deps]);

    if (data === null && config.options?.suspense) {
      throw new Promise(() => {}); // Suspend
    }

    return data as S;
  }

  // Dynamic middleware registration
  const middlewareRegistry = {
    middleware: [...(config.options?.middleware || [])],
    add(newMiddleware: NextStateMiddleware<T>) {
      this.middleware.push(newMiddleware);
    },
    remove(middleware: NextStateMiddleware<T>) {
      const index = this.middleware.indexOf(middleware);
      if (index > -1) {
        this.middleware.splice(index, 1);
      }
    },
  };

  // DevTools Panel Component
  const DevToolsPanel: FC = () => {
    const state = useNextState((state) => state);
    const [history, setHistory] = useState<T[]>([]);
    const [selected, setSelected] = useState<number>(0);
    const context = useContext(StateContext);

    useEffect(() => {
      setHistory((prev) => [...prev, state]);
    }, [state]);

    const timeTravel = (index: number) => {
      setSelected(index);
      const historicalState = history[index];
      context?.setState(historicalState);
    };

    if (
      typeof window === "undefined" ||
      process.env.NODE_ENV !== "development"
    ) {
      return null;
    }

    return (
      <div className="next-state-devtools">
        <h3>NextState DevTools</h3>
        <div className="state-history">
          {history.map((state, index) => (
            <div
              key={index}
              onClick={() => timeTravel(index)}
              className={index === selected ? "selected" : ""}
            >
              State #{index}
            </div>
          ))}
        </div>
        <pre>{JSON.stringify(state, null, 2)}</pre>
      </div>
    );
  };

  // Enhanced server integration with better caching
  function withNextServer<Args extends any[], Result>(
    key: string,
    handler: (...args: Args) => Promise<Result>
  ) {
    const cache = new Map<string, Result>();

    return async (...args: Args): Promise<Result> => {
      const cacheKey = `${key}-${JSON.stringify(args)}`;

      if (cache.has(cacheKey)) {
        return cache.get(cacheKey)!;
      }

      try {
        const result = await handler(...args);
        cache.set(cacheKey, result);
        return result;
      } catch (error) {
        throw new Error(`NextServer Error: ${error}`);
      }
    };
  }

  // Enhanced action creator with async support
  function createNextAction<Args extends any[]>(
    action: (...args: Args) => (state: T) => Partial<T> | Promise<Partial<T>>
  ) {
    return function useNextAction() {
      const context = useContext(StateContext);
      if (!context) {
        throw new Error("useNextAction must be used within NextStateProvider");
      }

      return useCallback(
        async (...args: Args) => {
          const update = action(...args);
          if (update instanceof Promise) {
            await context.setStateAsync(update);
          } else {
            await context.setState(update);
          }
        },
        [context]
      );
    };
  }

  return {
    Provider: NextStateProvider,
    useNextState,
    createNextAction,
    withNextServer,
    withNextStateProvider,
    DevToolsPanel,
    middlewareRegistry,
  };
}
