import React, { useState } from 'react';
import { Modal, Button } from 'antd';
import { observer } from 'mobx-react';

import { useStore } from 'hooks/useStore';
import { ModalStore } from 'stores/modalStore/modal-store';

import './GlobalModal.css';

function GlobalModal() {
  const modalStore = useStore<ModalStore>('modal');
  const [confirmLoading] = useState(false);

  const {
    title,
    isVisible,
    ModalContent,
    onOk,
    okLabel,
    onCancel,
    cancelLabel,
    showCancelButton,
    showOkButton,
    isLoading,
    loadingLabel,
    width,
    closable,
  } = modalStore;
  const content = ModalContent || undefined;

  const footer = [
    showCancelButton ? (
      <Button key="cancel" onClick={onCancel || undefined}>
        {cancelLabel ? cancelLabel : 'Cancel'}
      </Button>
    ) : null,

    showOkButton ? (
      <Button key="submit" type="primary" onClick={onOk || undefined} loading={isLoading}>
        {isLoading ? loadingLabel : okLabel}
      </Button>
    ) : null,
  ];

  console.log('closable', closable);

  return (
    <Modal
      title={title}
      visible={isVisible}
      confirmLoading={confirmLoading}
      onCancel={onCancel || undefined}
      footer={footer}
      wrapClassName="global-modal"
      width={width}
      closable={closable}
      maskClosable={closable}
    >
      {content}
    </Modal>
  );
}

export const ObservingGlobalModal = observer(GlobalModal);
