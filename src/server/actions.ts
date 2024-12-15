import { Action, AsyncAction } from '../types/types';

export function createServerAction<T>(action: Action<T> | AsyncAction<T>) {
  return action;
}
