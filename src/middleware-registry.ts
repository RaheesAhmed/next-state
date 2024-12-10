import type { NextStateMiddleware } from './types';

export class MiddlewareRegistry<T> {
  private middleware: Array<NextStateMiddleware<T> & { id: string }> = [];

  add(config: NextStateMiddleware<T>): string {
    const id = Math.random().toString(36).substr(2, 9);
    this.middleware.push({
      ...config,
      id,
      priority: config.priority || 0,
    });
    // Sort by priority in descending order
    this.middleware.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    return id;
  }

  remove(id: string): void {
    this.middleware = this.middleware.filter((m) => m.id !== id);
  }

  async execute(prev: T, next: T): Promise<void> {
    for (const m of this.middleware) {
      try {
        await m.onStateChange?.(prev, next);
      } catch (error) {
        m.onError?.(error as Error);
      }
    }
  }
}

export function createMiddleware<T>(config: NextStateMiddleware<T>): NextStateMiddleware<T> {
  return config;
}
