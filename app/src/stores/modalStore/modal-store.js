/* eslint-disable function-paren-newline */
import React from 'react';
import { observable, action, makeObservable } from 'mobx';
import defer from 'lodash.defer';

class ModalStore {
  ModalContent;

  title = '';

  isVisible = false;

  onOk;

  disableOk = true;

  okLabel = 'Ok';

  loadingLabel = 'Loading';

  onCancel;

  isLoading = false;

  width = '70vw';

  showCancelButton = true;

  constructor() {
    makeObservable(this, {
      ModalContent: observable.shallow,
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
      setProps: action,
      reset: action,
    });

    this.onCancel = this.closeModal;
  }

  setModelContent(ModalContent, props = {}, show = true) {
    this.ModalContent = <ModalContent />;
    this.props = props;
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
  };

  setProps = (props) => {
    this.props = props;
  };

  reset = () => {
    this.isVisible = false;
    defer(
      action(() => {
        this.ModalContent = null;
        this.onOk = null;
        this.disableOk = true;
        this.okLabel = 'Ok';
        this.loadingLabel = 'Loading';
        this.onCancel = this.closeModal;
        this.isLoading = false;
        this.width = '70vw';
        this.showCancelButton = true;
        this.props = {};
      }),
    );
  };
}

export const modalStore = new ModalStore();

export { ModalStore };
