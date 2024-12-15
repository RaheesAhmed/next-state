import { Selector } from '../types/types';

export function createServerSelector<T, S>(selector: Selector<T, S>) {
  return selector;
}
