import React, { useState } from 'react';
import { Modal, Button } from 'antd';
import { observer } from 'mobx-react';

import { useStore } from 'hooks/useStore';
import { ModalStore } from 'stores/modalStore/modal-store';

import './GlobalModal.css';

function GlobalModal() {
  const modalStore = useStore<ModalStore>('modal');
  const [confirmLoading] = useState(false);

  const { title, isVisible, ModalContent, onOk, okLabel, onCancel, cancelLabel, showCancelButton, isLoading, loadingLabel, width } = modalStore;
  const content = ModalContent || undefined;

  const footer = [
    showCancelButton ? (
      <Button key="cancel" onClick={onCancel || undefined}>
        {cancelLabel ? cancelLabel : 'Cancel'}
      </Button>
    ) : null,
    // Button should have prop 'disabled' but it's missing. Probably old broken Ant typedefs from Ant 3. loading={isLoading} disables the button though
    <Button key="submit" type="primary" onClick={onOk || undefined} loading={isLoading}>
      {isLoading ? loadingLabel : okLabel}
    </Button>,
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
    >
      {content}
    </Modal>
  );
}

export const ObservingGlobalModal = observer(GlobalModal);
