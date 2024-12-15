import { useContext, useEffect, useState } from 'react';
import { Selector } from '../types/types';

export function createHook<T, S>(selector: Selector<T, S>) {
  return function useNextStateHook() {
    const state = useContext<T>(null as any);
    const [selectedState, setSelectedState] = useState<S>(() => selector(state));

    useEffect(() => {
      setSelectedState(selector(state));
    }, [state, selector]);

    return selectedState;
  };
}
