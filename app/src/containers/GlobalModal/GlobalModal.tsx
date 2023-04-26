import React, { useState } from 'react';
import { Modal, Button } from 'antd';
import { observer } from 'mobx-react';

import { useStore } from 'hooks/useStore';
import { ModalStore } from 'stores/modalStore/modal-store';

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
    cancelType,
    cancelLabel,
    showCancelButton,
    showOkButton,
    isLoading,
    loadingLabel,
    width,
    closable,
  } = modalOptions;

  const content = modalStore.getModal(id);

  const footer = [
    showCancelButton ? (
      <Button key="cancel" type={cancelType} onClick={onCancel || undefined}>
        {cancelLabel ? cancelLabel : 'Cancel'}
      </Button>
    ) : null,

    showOkButton ? (
      <Button key="submit" type={okType} onClick={onOk || undefined} loading={isLoading}>
        {isLoading ? loadingLabel : okLabel}
      </Button>
    ) : null,
  ];

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
