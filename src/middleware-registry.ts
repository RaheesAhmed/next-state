import type { NextStateMiddlewareConfig } from './types';

export class MiddlewareRegistry<T> {
  private middleware: Array<NextStateMiddlewareConfig<T> & { id: string }> = [];

  add(config: NextStateMiddlewareConfig<T>): string {
    const id = Math.random().toString(36).substr(2, 9);
    this.middleware.push({
      ...config,
      id,
      priority: config.priority || 0,
    });
    this.middleware.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    return id;
  }

  remove(id: string): void {
    this.middleware = this.middleware.filter((m) => m.id !== id);
  }

  async execute(prev: T, next: T): Promise<void> {
    for (const m of this.middleware) {
      if (!m.condition || m.condition(prev, next)) {
        await m.onStateChange(prev, next);
      }
    }
  }
}

export function createMiddleware<T>(
  config: NextStateMiddlewareConfig<T>
): NextStateMiddlewareConfig<T> {
  return config;
}
