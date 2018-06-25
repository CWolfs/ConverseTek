import { decorate, observable, action } from 'mobx';
import defer from 'lodash.defer';

class ModalStore {
  constructor() {
    this.ModalContent = null;
    this.title = '';
    this.isVisible = false;
    this.onOk = null;
    this.disableOk = true;
    this.okLabel = 'Ok';
    this.loadingLabel = 'Loading';
    this.onCancel = null;
    this.isLoading = false;
    this.width = '70vw';
    this.showCancelButton = true;
    this.onCancel = this.closeModal;
  }

  setModelContent(component, show = true) {
    this.ModalContent = component;
    if (show) this.showModal(true);
  }

  setTitle(title) {
    this.title = title;
  }

  setWidth(width) {
    this.width = width;
  }

  setShowCancelButton(flag) {
    this.showCancelButton = flag;
  }

  setOnOk(onOk) {
    this.onOk = onOk;
  }

  setDisableOk(flag) {
    this.disableOk = flag;
  }

  setOkLabel(label) {
    this.okLabel = label;
  }

  setIsLoading(flag) {
    this.isLoading = flag;
  }

  setLoadingLabel(label) {
    this.loadingLabel = label;
  }

  showModal(flag) {
    this.isVisible = flag;
  }

  closeModal = () => {
    this.reset();
  }

  reset = () => {
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

decorate(ModalStore, {
  ModalContent: observable,
  title: observable,
  isVisible: observable,
  onOk: observable,
  disableOk: observable,
  okLabel: observable,
  loadingLabel: observable,
  onCancel: observable,
  isLoading: observable,
  width: observable,
  showCancelButton: observable,

  setModelContent: action,
  setTitle: action,
  setWidth: action,
  setShowCancelButton: action,
  setOnOk: action,
  setDisableOk: action,
  setOkLabel: action,
  setIsLoading: action,
  setLoadingLabel: action,
  showModal: action,
  closeModal: action,
  reset: action,
});

const modalStore = new ModalStore();

export default modalStore;
export { ModalStore };
