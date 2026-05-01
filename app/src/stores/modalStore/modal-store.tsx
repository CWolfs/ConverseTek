/* eslint-disable function-paren-newline */
import React, { ElementType, KeyboardEvent, MouseEvent } from 'react';
import { observable, action, makeObservable } from 'mobx';
import { LegacyButtonType } from 'utils/antd-button-utils';

import { getDevPreservedStore } from '../dev-preserved-store';

export type OnOkType = ((event: MouseEvent<HTMLElement>, value?: string) => void) | null;
export type OnCancelType = ((event: KeyboardEvent<HTMLElement> | MouseEvent<HTMLElement>) => void) | null;

export type FSModalProps = {
  fileMode?: boolean;
};

type ModalOptions = {
  props: FSModalProps;

  title: string | JSX.Element;
  width: string;

  showOkButton: boolean;
  okType: LegacyButtonType;
  okLabel: string;
  disableOk: boolean;
  onOk: OnOkType;

  showCancelButton: boolean;
  cancelType: LegacyButtonType;
  cancelLabel: string;
  onCancel: OnCancelType;

  isLoading: boolean;
  loadingLabel: string;

  centered: boolean;
  isVisible: boolean;
  closable: boolean;
  maskClosable: boolean;
};

class ModalStore {
  modals = new Map<string, ElementType | JSX.Element>();
  options = new Map<string, ModalOptions>();
  private modalVersion = 0;

  constructor() {
    makeObservable(this, {
      modals: observable.deep,
      options: observable,

      setModelContent: action,
      setTitle: action,
      setWidth: action,
      setShowCancelButton: action,
      setShowOkButton: action,
      setOnOk: action,
      setOnCancel: action,
      setDisableOk: action,
      setOkType: action,
      setOkLabel: action,
      setCancelType: action,
      setCancelLabel: action,
      setIsLoading: action,
      setLoadingLabel: action,
      setClosable: action,
      setMaskClosable: action,
      showModal: action,
      closeModal: action,
      setProps: action,
      reset: action,
      getOptions: action,
    });
  }

  setModelContent(ModalContent: ElementType, props = {}, globalModalId: string, show = true): void {
    this.modalVersion += 1;
    this.modals.set(globalModalId, <ModalContent key={`${globalModalId}-${this.modalVersion}`} globalModalId={globalModalId} {...props} />);

    const options: ModalOptions = {
      props,

      title: '',
      width: '70vw',

      showOkButton: true,
      okType: 'primary',
      okLabel: 'Ok',
      disableOk: true,
      onOk: null,

      showCancelButton: true,
      cancelType: undefined,
      cancelLabel: 'Cancel',
      onCancel: () => this.closeModal(globalModalId),

      isLoading: false,
      loadingLabel: 'Loading',

      centered: false,
      isVisible: false,
      closable: true,
      maskClosable: true,

      ...props,
    };

    this.options.set(globalModalId, options);
    if (show) this.showModal(true, globalModalId);
  }

  getModal(globalModalId: string): JSX.Element | React.ElementType | undefined {
    return this.modals.get(globalModalId);
  }

  getOptions(globalModalId: string): ModalOptions | undefined {
    return this.options.get(globalModalId);
  }

  setTitle(title: string | JSX.Element, globalModalId: string): void {
    const modalOptions = this.options.get(globalModalId);
    if (modalOptions == null) return;

    modalOptions.title = title;
  }

  setWidth(width: string, globalModalId: string): void {
    const modalOptions = this.options.get(globalModalId);
    if (modalOptions == null) return;

    modalOptions.width = width;
  }

  setShowCancelButton(flag: boolean, globalModalId: string): void {
    const modalOptions = this.options.get(globalModalId);
    if (modalOptions == null) return;

    modalOptions.showCancelButton = flag;
  }

  setShowOkButton(flag: boolean, globalModalId: string): void {
    const modalOptions = this.options.get(globalModalId);
    if (modalOptions == null) return;

    modalOptions.showOkButton = flag;
  }

  setOnOk(onOk: OnOkType, globalModalId: string): void {
    const modalOptions = this.options.get(globalModalId);
    if (modalOptions == null) return;

    modalOptions.onOk = onOk;
  }

  setOnCancel(onCancel: OnCancelType, globalModalId: string): void {
    const modalOptions = this.options.get(globalModalId);
    if (modalOptions == null) return;

    modalOptions.onCancel = (event) => {
      if (onCancel) onCancel(event);
      this.closeModal(globalModalId);
    };
  }

  setDisableOk(flag: boolean, globalModalId: string): void {
    const modalOptions = this.options.get(globalModalId);
    if (modalOptions == null) return;

    modalOptions.disableOk = flag;
  }

  setOkType(type: LegacyButtonType, globalModalId: string): void {
    const modalOptions = this.options.get(globalModalId);
    if (modalOptions == null) return;

    modalOptions.okType = type;
  }

  setOkLabel(label: string, globalModalId: string): void {
    const modalOptions = this.options.get(globalModalId);
    if (modalOptions == null) return;

    modalOptions.okLabel = label;
  }

  setCancelType(type: LegacyButtonType, globalModalId: string): void {
    const modalOptions = this.options.get(globalModalId);
    if (modalOptions == null) return;

    modalOptions.cancelType = type;
  }

  setCancelLabel(label: string, globalModalId: string): void {
    const modalOptions = this.options.get(globalModalId);
    if (modalOptions == null) return;

    modalOptions.cancelLabel = label;
  }

  setIsLoading(flag: boolean, globalModalId: string): void {
    const modalOptions = this.options.get(globalModalId);
    if (modalOptions == null) return;

    modalOptions.isLoading = flag;
  }

  setLoadingLabel(label: string, globalModalId: string): void {
    const modalOptions = this.options.get(globalModalId);
    if (modalOptions == null) return;

    modalOptions.loadingLabel = label;
  }

  setClosable(closable: boolean, globalModalId: string): void {
    const modalOptions = this.options.get(globalModalId);
    if (modalOptions == null) return;

    modalOptions.closable = closable;
  }

  setMaskClosable(maskClosable: boolean, globalModalId: string): void {
    const modalOptions = this.options.get(globalModalId);
    if (modalOptions == null) return;

    modalOptions.maskClosable = maskClosable;
  }

  showModal(flag: boolean, globalModalId: string): void {
    const modalOptions = this.options.get(globalModalId);
    if (modalOptions == null) return;

    modalOptions.isVisible = flag;
  }

  closeModal = (globalModalId: string): void => {
    const modalOptions = this.options.get(globalModalId);
    if (modalOptions == null) return;

    this.reset(globalModalId);
  };

  setProps = (props: object, globalModalId: string): void => {
    const modalOptions = this.options.get(globalModalId);
    if (modalOptions == null) return;

    modalOptions.props = props;
  };

  reset = (globalModalId: string): void => {
    const modalOptions = this.options.get(globalModalId);
    if (modalOptions == null) return;

    modalOptions.isVisible = false;
  };
}

export const modalStore = getDevPreservedStore('__conversetekModalStore', () => new ModalStore(), ModalStore.prototype);

export { ModalStore };
