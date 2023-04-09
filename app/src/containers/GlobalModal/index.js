import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button } from 'antd';
import { observer, inject } from 'mobx-react';

import './GlobalModal.css';

class GlobalModal extends Component {
  constructor(props) {
    super(props);

    this.state = {
      confirmLoading: false,
    };
  }

  render() {
    const { modalStore } = this.props;
    const { title, isVisible, ModalContent, onOk, disableOk, okLabel, onCancel, showCancelButton, isLoading, loadingLabel, width } =
      modalStore;
    const { confirmLoading } = this.state;

    console.log('test');

    const content = ModalContent ? <ModalContent modalStore={modalStore} /> : undefined;

    console.log('test2');

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
}

GlobalModal.propTypes = {
  modalStore: PropTypes.object.isRequired,
};

export default inject('modalStore')(observer(GlobalModal));
