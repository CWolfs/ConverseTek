import React, { useState } from 'react';
import { Modal, Button } from 'antd';
import { observer } from 'mobx-react';

import { useStore } from 'hooks/useStore';
import { ModalStore } from 'stores/modalStore/modal-store';
import { getAntdButtonClassName, getAntdButtonType, isAntdButtonDanger } from 'utils/antd-button-utils';

import './GlobalModal.css';

function GlobalModal({ id }: { id: string }) {
  const modalStore = useStore<ModalStore>('modal');
  const [confirmLoading] = useState(false);

  const { options: modalOptionsMap } = modalStore;
  const modalOptions = modalOptionsMap.get(id);
  if (modalOptions == null) return null;

  const {
    title,
    isVisible,
    onOk,
    okType,
    okLabel,
    onCancel,
    disableOk,
    cancelType,
    cancelLabel,
    showCancelButton,
    showOkButton,
    isLoading,
    loadingLabel,
    width,
    centered,
    closable,
    maskClosable,
  } = modalOptions;

  const content = modalStore.getModal(id);

  const footer = [
    showCancelButton ? (
      <Button
        key="cancel"
        className={getAntdButtonClassName(cancelType)}
        type={getAntdButtonType(cancelType)}
        danger={isAntdButtonDanger(cancelType)}
        onClick={onCancel || undefined}
      >
        {cancelLabel ? cancelLabel : 'Cancel'}
      </Button>
    ) : null,

    showOkButton ? (
      <Button
        key="submit"
        className={getAntdButtonClassName(okType)}
        type={getAntdButtonType(okType)}
        danger={isAntdButtonDanger(okType)}
        onClick={onOk || undefined}
        loading={isLoading}
        disabled={disableOk}
      >
        {isLoading ? loadingLabel : okLabel}
      </Button>
    ) : null,
  ];

  return (
    <Modal
      title={title}
      open={isVisible}
      confirmLoading={confirmLoading}
      onCancel={onCancel || undefined}
      footer={footer}
      wrapClassName="global-modal"
      width={width}
      closable={closable}
      maskClosable={maskClosable}
      centered={centered}
      transitionName=""
      maskTransitionName=""
    >
      {React.isValidElement(content) ? content : null}
    </Modal>
  );
}

export const ObservingGlobalModal = observer(GlobalModal);
