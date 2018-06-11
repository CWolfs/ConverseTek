import React, { Component } from 'react';
import PropTypes from 'prop-types';

/* eslint-disable react/prefer-stateless-function, no-useless-constructor */
class FileSystemPicker extends Component {
  constructor(props) {
    super(props);

    const { modalStore } = this.props;

    this.onOk = this.onOk.bind(this);
    modalStore.setOnOk(this.onOk);
  }

  onOk() {
    const { modalStore } = this.props;
    modalStore.closeModal();
  }

  render() {
    return (
      <div>File picker</div>
    );
  }
}

FileSystemPicker.propTypes = {
  modalStore: PropTypes.object.isRequired,
};

export default FileSystemPicker;
