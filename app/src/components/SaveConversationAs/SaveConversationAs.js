import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { message, Input } from 'antd';

import { updateConversation } from 'services/api';
import { useStore } from 'hooks/useStore';

import './SaveConversationAs.css';

function SaveConversationAs() {
  const dataStore = useStore('data');
  const modalStore = useStore('modal');

  const { unsavedActiveConversationAsset: conversationAsset } = dataStore;

  const [suggestedFileName] = useState(`${conversationAsset.Conversation.idRef.id}.convo.bytes`);
  const [modifiedFileName, setModifiedFileName] = useState(null);

  const onOk = () => {
    const { FileName: previousFileName, FilePath: previousFilePath } = conversationAsset;

    conversationAsset.FileName = (modifiedFileName || suggestedFileName).replace('.bytes', '');
    conversationAsset.FilePath = previousFilePath.replace(previousFileName, conversationAsset.FileName);

    updateConversation(conversationAsset.Conversation.idRef.id, conversationAsset).then(() => {
      message.success('Save successful');
    });
    dataStore.updateActiveConversation(conversationAsset); // local update for speed

    modalStore.closeModal();
  };

  const setupModal = () => {
    modalStore.setOnOk(onOk);
    modalStore.setTitle('Save Conversation As...');
    modalStore.setOkLabel('Save');
    modalStore.setDisableOk(false);
    modalStore.setWidth('40vw');
    modalStore.setShowCancelButton(true);
  };

  const handleFileNameChange = (event) => {
    const newFileName = event.target.value.trim();
    setModifiedFileName(newFileName);
  };

  useEffect(() => {
    setupModal();
  });

  return (
    <div className="save-conversation-as">
      <Input value={modifiedFileName || suggestedFileName} onChange={handleFileNameChange} />
    </div>
  );
}

export const ObservingSaveConversationAs = observer(SaveConversationAs);
