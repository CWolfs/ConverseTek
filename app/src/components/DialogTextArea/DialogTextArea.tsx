import React, { ChangeEvent } from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import { Input } from 'antd';
import { NodeType } from 'types/NodeType';
import { NodeLinkType } from 'types/NodeLinkType';

const { TextArea } = Input;

function DialogTextArea({ node }: { node: NodeType | NodeLinkType }) {
  const { type } = node;

  let text = '';
  if (type === 'node') {
    text = node.text;
  } else {
    text = node.responseText;
  }

  const handleDialogChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
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
