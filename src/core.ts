import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useEffect,
  useState,
} from "react";
import type { StateConfig, Action, Selector } from "./types";

export function create<T extends object>(config: StateConfig<T>) {
  // State container
  let state = config.initialState;
  const listeners = new Set<(state: T) => void>();
  const serverCache = new Map<string, any>();

  // Context setup
  const StateContext = createContext<{
    getState: () => T;
    setState: (update: Partial<T>) => void;
    subscribe: (listener: (state: T) => void) => () => void;
  } | null>(null);

  // Storage handling
  const storage = {
    save: async (data: T) => {
      if (config.persist && typeof window !== "undefined") {
        localStorage.setItem(
          config.key || "next-state",
          JSON.stringify({
            version: config.version || 1,
            data,
          })
        );
      }
    },
    load: () => {
      if (config.persist && typeof window !== "undefined") {
        const saved = localStorage.getItem(config.key || "next-state");
        if (saved) {
          const { version, data } = JSON.parse(saved);
          if (version === (config.version || 1)) {
            return data;
          } else if (config.migrations?.[version]) {
            return config.migrations[version](data);
          }
        }
      }
      return null;
    },
  };

  // Provider component
  const Provider: React.FC<{
    children: React.ReactNode;
    initialState?: Partial<T>;
  }> = ({ children, initialState }) => {
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
      const saved = storage.load();
      if (saved || initialState) {
        state = { ...state, ...(saved || initialState) };
        listeners.forEach((listener) => listener(state));
      }
      setIsHydrated(true);
    }, [initialState]);

    const store = {
      getState: () => state,
      setState: (update: Partial<T>) => {
        state = { ...state, ...update };
        listeners.forEach((listener) => listener(state));
        storage.save(state);
      },
      subscribe: (listener: (state: T) => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };

    if (!isHydrated && config.persist) {
      return null;
    }

    return (
      <StateContext.Provider value={store}>{children}</StateContext.Provider>
    );
  };

  // React hooks
  function useStore<S>(selector: Selector<T, S>): S {
    const store = useContext(StateContext);
    if (!store) throw new Error("next-state: Provider not found");

    const [value, setValue] = useState(() => selector(store.getState()));
    const selectorRef = useRef(selector);

    useEffect(() => {
      selectorRef.current = selector;
    });

    useEffect(() => {
      return store.subscribe((state) => {
        const newValue = selectorRef.current(state);
        setValue(newValue);
      });
    }, [store]);

    return value;
  }

  function useAction<Args extends any[]>(
    actionCreator: (...args: Args) => Action<T>
  ) {
    const store = useContext(StateContext);
    if (!store) throw new Error("next-state: Provider not found");

    return useCallback(
      (...args: Args) => {
        const action = actionCreator(...args);
        const update = action(store.getState());
        if (update instanceof Promise) {
          return update.then(store.setState);
        }
        store.setState(update);
      },
      [store, actionCreator]
    );
  }

  // Server integration
  function withServer<Args extends any[]>(
    key: string,
    fn: (...args: Args) => Promise<Partial<T>>
  ) {
    return async (...args: Args) => {
      const cacheKey = `${key}-${JSON.stringify(args)}`;

      if (serverCache.has(cacheKey)) {
        return serverCache.get(cacheKey);
      }

      const result = await fn(...args);
      serverCache.set(cacheKey, result);

      return result;
    };
  }

  return {
    getState: () => state,
    setState: (update: Partial<T>) => {
      state = { ...state, ...update };
      listeners.forEach((listener) => listener(state));
      storage.save(state);
    },
    subscribe: (listener: (state: T) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    useStore,
    useAction,
    withServer,
    Provider,
  };
}
