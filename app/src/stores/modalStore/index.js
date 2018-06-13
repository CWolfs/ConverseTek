import { observable, action } from 'mobx';
import defer from 'lodash.defer';

class ModalStore {
  @observable ModalContent;
  @observable title = '';
  @observable isVisible = false;
  @observable onOk;
  @observable disableOk = true;
  @observable okLabel = 'Ok';
  @observable loadingLabel = 'Loading';
  @observable onCancel;
  @observable isLoading = false;
  @observable width = '70vw';
  @observable showCancelButton = true;

  constructor() {
    this.onCancel = this.closeModal;
  }

  @action setModelContent(component, show = true) {
    this.ModalContent = component;
    if (show) this.showModal(true);
  }

  @action setTitle(title) {
    this.title = title;
  }

  @action setWidth(width) {
    this.width = width;
  }

  @action setShowCancelButton(flag) {
    this.showCancelButton = flag;
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
    defer(() => {
      this.ModalContent = null;
      this.onOk = null;
      this.disableOk = true;
      this.okLabel = 'Ok';
      this.loadingLabel = 'Loading';
      this.onCancel = this.closeModal;
      this.isLoading = false;
      this.width = '70vw';
      this.showCancelButton = true;
    });
  }
}

const modalStore = new ModalStore();

export default modalStore;
export { ModalStore };
