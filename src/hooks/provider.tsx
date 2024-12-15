import React, { createContext, useContext } from 'react';
import { ProviderProps } from '../types/types';

const NextStateContext = createContext<any>(null);

export function NextStateProvider({ children, initialState }: ProviderProps) {
  return <NextStateContext.Provider value={initialState}>{children}</NextStateContext.Provider>;
}
