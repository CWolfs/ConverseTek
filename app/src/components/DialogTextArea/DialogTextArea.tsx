import React, { ChangeEvent } from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import { Input } from 'antd';
import { ElementNodeType, PromptNodeType } from 'types';
import { useStore } from 'hooks/useStore';
import { NodeStore } from 'stores/nodeStore/node-store';

import './DialogTextArea.css';

const { TextArea } = Input;

function DialogTextArea({ node }: { node: PromptNodeType | ElementNodeType }) {
  const { type } = node;
  const nodeStore = useStore<NodeStore>('node');

  let text = '';
  if (type === 'node') {
    text = node.text;
  } else {
    text = node.responseText;
  }

  const handleDialogChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const inputText = event.target.value;
    nodeStore.setNodeText(node, inputText);
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
