import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button } from 'antd';
import { observer, inject } from 'mobx-react';

import './GlobalModal.css';

@observer
class GlobalModal extends Component {
  constructor(props) {
    super(props);

    this.state = {
      confirmLoading: false,
    };
  }

  render() {
    const { modalStore } = this.props;
    const {
      isVisible,
      ModalContent,
      onOk,
      disableOk,
      okLabel,
      onCancel,
      isLoading,
      loadingLabel,
    } = modalStore;
    const { confirmLoading } = this.state;

    const content = (ModalContent) ? <ModalContent modalStore={modalStore} /> : undefined;

    const footer = [
      <Button key="cancel" onClick={onCancel}>Cancel</Button>,
      <Button key="submit" type="primary" onClick={onOk} loading={isLoading} disabled={disableOk}>
        {(isLoading) ? loadingLabel : okLabel}
      </Button>,
    ];

    return (
      <Modal
        title="Select a conversation directory"
        visible={isVisible}
        confirmLoading={confirmLoading}
        onCancel={onCancel}
        footer={footer}
        loading={isLoading}
        wrapClassName="global-modal"
        width="70vw"
      >
        {content}
      </Modal>
    );
  }
}

GlobalModal.propTypes = {
  modalStore: PropTypes.object.isRequired,
};

export default inject('modalStore')(GlobalModal);
