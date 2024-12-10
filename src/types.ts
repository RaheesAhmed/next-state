export type NextStateMigration<T> = {
  version: number;
  migrate: (state: any) => T;
};

export type NextStateMiddlewareConfig<T> = {
  condition?: (prev: T, next: T) => boolean;
  onStateChange: (prev: T, next: T) => void;
  priority?: number;
};

export type NextStateStorageConfig<T> = {
  storage: "localStorage" | "sessionStorage" | "indexedDB";
  key?: string;
  version?: number;
  migrations?: NextStateMigration<T>[];
  onError?: (error: NextStateError) => void;
  retry?: {
    attempts: number;
    delay: number;
  };
};
