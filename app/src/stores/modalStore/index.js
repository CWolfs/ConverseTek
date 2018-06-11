import { observable, action } from 'mobx';

class ModalStore {
  @observable ModalContent;
  @observable isVisible = false;
  @observable onOk;
  @observable okLabel = 'Ok';
  @observable onCancel;

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

  @action setOkLabel(label) {
    this.okLabel = label;
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
  }
}

const modalStore = new ModalStore();

export default modalStore;
export { ModalStore };
