import { decorate, observable, action } from 'mobx';

class ErrorStore {
  @observable authErrors = observable.map();

  @action setError = (code, error) => {
    if ((code >= 100) && (code < 199)) {
      this.authErrors.set(code, error);
    }
  }

  @action resetAll = () => {
    this.authErrors.clear();
  }

  @action reset = (codes) => {
    codes.forEach(code => this.authErrors.delete(code));
  }
}

const errorStore = new ErrorStore();

export default errorStore;
export { ErrorStore };
