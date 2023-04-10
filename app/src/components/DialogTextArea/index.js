import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import { Input } from 'antd';

const { TextArea } = Input;

/* eslint-disable no-param-reassign */
class DialogTextArea extends Component {
  constructor(props) {
    super(props);

    this.handleDialogChange = this.handleDialogChange.bind(this);
  }

  handleDialogChange(event) {
    const { node } = this.props;
    const { type } = node;

    const inputText = event.target.value;

    if (type === 'node') {
      node.text = inputText;
    } else {
      node.responseText = inputText;
    }
  }

  render() {
    const { node } = this.props;
    const text = node.text || node.responseText;

    return (
      <div className="dialog-text-area">
        <TextArea value={text} onChange={this.handleDialogChange} />
      </div>
    );
  }
}

DialogTextArea.propTypes = {
  node: PropTypes.object.isRequired,
};

export default observer(DialogTextArea);
