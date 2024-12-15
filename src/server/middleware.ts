import { Middleware } from '../types/types';

export function createServerMiddleware<T>(middleware: Middleware<T>) {
  return middleware;
}
