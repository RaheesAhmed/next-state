import React from 'react';
import { StateConfig } from '../types/types';

export function withServerState<P extends object, T extends object>(
  WrappedComponent: React.ComponentType<P>,
  config: StateConfig<T>
) {
  return function WithServerStateWrapper(props: P) {
    return <WrappedComponent {...props} />;
  };
}
