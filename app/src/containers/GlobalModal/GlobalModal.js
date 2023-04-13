import React, { useState } from 'react';
import { Modal, Button } from 'antd';
import { observer } from 'mobx-react';

import { useStore } from 'hooks/useStore';

import './GlobalModal.css';

function GlobalModal() {
  const modalStore = useStore('modal');
  const [confirmLoading] = useState(false);

  const { title, isVisible, ModalContent, onOk, disableOk, okLabel, onCancel, showCancelButton, isLoading, loadingLabel, width } = modalStore;
  const content = ModalContent || undefined;

  const footer = [
    showCancelButton ? (
      <Button key="cancel" onClick={onCancel}>
        Cancel
      </Button>
    ) : null,
    <Button key="submit" type="primary" onClick={onOk} loading={isLoading} disabled={disableOk}>
      {isLoading ? loadingLabel : okLabel}
    </Button>,
  ];

  return (
    <Modal
      title={title}
      visible={isVisible}
      confirmLoading={confirmLoading}
      onCancel={onCancel}
      footer={footer}
      loading={isLoading}
      wrapClassName="global-modal"
      width={width}
    >
      {content}
    </Modal>
  );
}

export const ObservingGlobalModal = observer(GlobalModal);
