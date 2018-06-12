import { observable, action } from 'mobx';

class ModalStore {
  @observable ModalContent;
  @observable isVisible = false;
  @observable onOk;
  @observable disableOk = true;
  @observable okLabel = 'Ok';
  @observable loadingLabel = 'Loading';
  @observable onCancel;
  @observable isLoading = false;

  constructor() {
    this.onCancel = this.closeModal;
  }

  @action setModelContent(component, show = true) {
    this.ModalContent = component;
    if (show) this.showModal(true);
  }

  @action setOnOk(onOk) {
    this.onOk = onOk;
  }

  @action setDisableOk(flag) {
    this.disableOk = flag;
  }

  @action setOkLabel(label) {
    this.okLabel = label;
  }

  @action setIsLoading(flag) {
    this.isLoading = flag;
  }

  @action setLoadingLabel(label) {
    this.loadingLabel = label;
  }

  @action showModal(flag) {
    this.isVisible = flag;
  }

  @action closeModal = () => {
    this.reset();
  }

  @action reset = () => {
    this.isVisible = false;
    this.ModalContent = null;
    this.onOk = null;
    this.disableOk = true;
    this.okLabel = 'Ok';
    this.loadingLabel = 'Loading';
    this.onCancel = null;
    this.isLoading = false;
  }
}

const modalStore = new ModalStore();

export default modalStore;
export { ModalStore };
