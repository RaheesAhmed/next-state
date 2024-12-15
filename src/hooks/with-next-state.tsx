import React from 'react';
import { NextStateProvider } from './provider';

export function withNextState<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  initialState: any
) {
  return function WithNextStateWrapper(props: P) {
    return (
      <NextStateProvider initialState={initialState}>
        <WrappedComponent {...props} />
      </NextStateProvider>
    );
  };
}
