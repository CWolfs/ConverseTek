import React from 'react';
import PropTypes from 'prop-types';
import { Input } from 'antd';

const { TextArea } = Input;

const DialogTextArea = ({ node }) => {
  const text = node.text || node.responseText;

  return (
    <div className="dialog-text-area">
      <TextArea value={text} />
    </div>
  );
};

DialogTextArea.propTypes = {
  node: PropTypes.object.isRequired,
};

export default DialogTextArea;
