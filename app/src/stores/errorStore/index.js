import { decorate, observable, action } from 'mobx';

class ErrorStore {
  authErrors = observable.map();

  setError = (code, error) => {
    if ((code >= 100) && (code < 199)) {
      this.authErrors.set(code, error);
    }
  }

  resetAll = () => {
    this.authErrors.clear();
  }

  reset = (codes) => {
    codes.forEach(code => this.authErrors.delete(code));
  }
}

decorate(ErrorStore, {
  authErrors: observable,

  setError: action,
  resetAll: action,
  reset: action,
});

const errorStore = new ErrorStore();

export default errorStore;
export { ErrorStore };
