/* eslint-disable function-paren-newline */
import React, { MouseEvent, ElementType } from 'react';
import { observable, action, makeObservable } from 'mobx';
import defer from 'lodash.defer';

export type OnOkType = ((event: MouseEvent<HTMLButtonElement>) => void) | null;
export type OnCancelType = ((event: MouseEvent<HTMLButtonElement>) => void) | null;

export type FSModalProps = {
  fileMode?: boolean;
};

class ModalStore {
  ModalContent: ElementType | JSX.Element | null = null;
  title = '';
  isVisible = false;
  onOk: OnOkType = null;
  disableOk = true;
  okLabel = 'Ok';
  loadingLabel = 'Loading';
  onCancel: OnCancelType = null;
  isLoading = false;
  width = '70vw';
  showCancelButton = true;
  props = {};

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

  setModelContent(ModalContent: ElementType, props = {}, show = true): void {
    this.ModalContent = <ModalContent />;
    this.props = props;
    if (show) this.showModal(true);
  }

  setTitle(title: string): void {
    this.title = title;
  }

  setWidth(width: string): void {
    this.width = width;
  }

  setShowCancelButton(flag: boolean): void {
    this.showCancelButton = flag;
  }

  setOnOk(onOk: OnOkType): void {
    this.onOk = onOk;
  }

  setDisableOk(flag: boolean): void {
    this.disableOk = flag;
  }

  setOkLabel(label: string): void {
    this.okLabel = label;
  }

  setIsLoading(flag: boolean): void {
    this.isLoading = flag;
  }

  setLoadingLabel(label: string): void {
    this.loadingLabel = label;
  }

  showModal(flag: boolean): void {
    this.isVisible = flag;
  }

  closeModal = (): void => {
    this.reset();
  };

  setProps = (props: object): void => {
    this.props = props;
  };

  reset = (): void => {
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
