import { observable, action, makeObservable } from 'mobx';

import { getDevPreservedStore } from '../dev-preserved-store';

class ErrorStore {
  authErrors = observable.map<number, string>();

  setError = (code: number, error: string) => {
    if (code >= 100 && code < 199) {
      this.authErrors.set(code, error);
    }
  };

  resetAll = () => {
    this.authErrors.clear();
  };

  reset = (codes: number[]) => {
    codes.forEach((code) => this.authErrors.delete(code));
  };

  constructor() {
    makeObservable(this, {
      authErrors: observable,
      setError: action,
      resetAll: action,
      reset: action,
    });
  }
}

export const errorStore = getDevPreservedStore('__conversetekErrorStore', () => new ErrorStore(), ErrorStore.prototype);

export { ErrorStore };
