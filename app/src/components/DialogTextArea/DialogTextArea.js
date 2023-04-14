import React from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import { Input } from 'antd';

const { TextArea } = Input;

function DialogTextArea({ node }) {
  const text = node.text || node.responseText;

  const handleDialogChange = (event) => {
    const { type } = node;

    const inputText = event.target.value;

    if (type === 'node') {
      // FIXME: Implement immutability for nodes
      node.text = inputText;
    } else {
      // FIXME: Implement immutability for nodes
      node.responseText = inputText;
    }
  };

  return (
    <div className="dialog-text-area">
      <TextArea value={text} onChange={handleDialogChange} />
    </div>
  );
}

DialogTextArea.propTypes = {
  node: PropTypes.object.isRequired,
};

export const ObservingDialogTextArea = observer(DialogTextArea);
