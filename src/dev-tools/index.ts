import type { DeepReadonly, PerformanceMetrics, StateSnapshot } from '../types/types';

interface DevToolsAction {
  type: string;
  payload: unknown;
  timestamp: number;
  duration?: number;
}

interface DevToolsState<T> {
  currentState: DeepReadonly<T>;
  actions: DevToolsAction[];
  snapshots: StateSnapshot<T>[];
  performance: PerformanceMetrics;
}

export class DevTools<T extends object> {
  private enabled: boolean;
  private maxSnapshots: number;
  private actions: DevToolsAction[] = [];
  private snapshots: StateSnapshot<T>[] = [];
  private listeners = new Set<(state: DevToolsState<T>) => void>();
  private startTime = Date.now();

  constructor(
    private initialState: T,
    options: { maxSnapshots?: number; enabled?: boolean } = {}
  ) {
    this.enabled = options.enabled ?? process.env.NODE_ENV === 'development';
    this.maxSnapshots = options.maxSnapshots ?? 50;
    
    if (this.enabled) {
      this.initializeDevTools();
    }
  }

  private initializeDevTools() {
    // Initialize browser extension connection
    if (typeof window !== 'undefined' && (window as any).__NEXT_STATE_DEVTOOLS__) {
      (window as any).__NEXT_STATE_DEVTOOLS__.connect(this.getDevToolsAPI());
    }

    // Create initial snapshot
    this.createSnapshot(this.initialState);
  }

  private getDevToolsAPI() {
    return {
      subscribe: (callback: (state: DevToolsState<T>) => void) => {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
      },
      getState: () => this.getDevToolsState(),
      jumpToState: (index: number) => this.jumpToState(index),
      importState: (state: T) => this.importState(state),
      exportState: () => this.exportState(),
      clearHistory: () => this.clearHistory(),
    };
  }

  logAction(action: Omit<DevToolsAction, 'timestamp'>) {
    if (!this.enabled) return;

    const timestamp = Date.now();
    const fullAction = { ...action, timestamp };
    this.actions.push(fullAction);

    this.notifyListeners();
  }

  createSnapshot(state: T) {
    if (!this.enabled) return;

    const snapshot: StateSnapshot<T> = {
      state: structuredClone(state),
      timestamp: Date.now(),
    };

    this.snapshots.push(snapshot);

    // Maintain max snapshots limit
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    this.notifyListeners();
  }

  private jumpToState(snapshotIndex: number): T | null {
    if (!this.enabled || snapshotIndex >= this.snapshots.length) return null;

    return structuredClone(this.snapshots[snapshotIndex].state);
  }

  private importState(state: T) {
    if (!this.enabled) return;

    this.clearHistory();
    this.createSnapshot(state);
    return state;
  }

  private exportState(): string {
    if (!this.enabled) return '';

    return JSON.stringify({
      state: this.snapshots[this.snapshots.length - 1]?.state,
      actions: this.actions,
      snapshots: this.snapshots,
      timestamp: Date.now(),
    }, null, 2);
  }

  private clearHistory() {
    if (!this.enabled) return;

    this.actions = [];
    this.snapshots = [];
    this.startTime = Date.now();
    this.notifyListeners();
  }

  getPerformanceMetrics(): PerformanceMetrics {
    const totalTime = Date.now() - this.startTime;
    const actionCount = this.actions.length;
    
    return {
      updates: actionCount,
      listeners: this.listeners.size,
      avgUpdateTime: actionCount ? 
        this.actions.reduce((sum, action) => sum + (action.duration || 0), 0) / actionCount : 
        0,
      lastUpdateTime: this.actions[this.actions.length - 1]?.duration || 0,
    };
  }

  private getDevToolsState(): DevToolsState<T> {
    return {
      currentState: this.snapshots[this.snapshots.length - 1]?.state as DeepReadonly<T>,
      actions: this.actions,
      snapshots: this.snapshots,
      performance: this.getPerformanceMetrics(),
    };
  }

  private notifyListeners() {
    const state = this.getDevToolsState();
    this.listeners.forEach(listener => listener(state));
  }
} 